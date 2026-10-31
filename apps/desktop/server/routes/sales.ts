import { Router } from 'express';
import type { CreateRefundInput, SaleDetailDTO, SaleLine, SaleListItemDTO, SaleTotals } from '@pos-dz/shared';
import { Ctx, HttpError, handler, likePattern, newId, nowIso, toIso } from '../util';

const lineKey = (productId: string, variantSku?: string | null) => `${productId}::${variantSku ?? ''}`;

export function salesRouter({ db }: Ctx) {
  const router = Router();

  const cashierName = (tenantId: string, id: string): string =>
    (db.prepare('SELECT name FROM users WHERE tenant_id = ? AND id = ?').get(tenantId, id) as any)?.name ?? 'Inconnu';

  const listItem = (tenantId: string, s: any): SaleListItemDTO => ({
    id: s.id,
    number: s.number,
    type: s.type,
    storeId: s.store_id,
    cashierName: cashierName(tenantId, s.cashier_id),
    createdAtLocal: s.created_at_local,
    grandTotalCents: s.grand_total_cents,
    paymentMethods: JSON.parse(s.payments).map((p: any) => p.method),
    status: s.status,
  });

  function detail(tenantId: string, saleId: string): SaleDetailDTO | null {
    const s: any = db.prepare('SELECT * FROM sales WHERE tenant_id = ? AND id = ?').get(tenantId, saleId);
    if (!s) return null;
    const lines: SaleLine[] = JSON.parse(s.lines);
    const out: SaleDetailDTO = { ...listItem(tenantId, s), lines, payments: JSON.parse(s.payments), totals: JSON.parse(s.totals) };
    if (s.type === 'refund' && s.refund_of) out.refundOf = s.refund_of;
    if (s.type === 'sale') {
      const refunds = db.prepare("SELECT * FROM sales WHERE tenant_id = ? AND refund_of = ? AND type = 'refund' ORDER BY created_at_local DESC").all(tenantId, s.id) as any[];
      const refunded = new Map<string, number>();
      for (const r of refunds) {
        for (const l of JSON.parse(r.lines) as SaleLine[]) {
          const k = lineKey(l.productId, l.variantSku);
          refunded.set(k, (refunded.get(k) ?? 0) + l.quantity);
        }
      }
      out.refundedQuantities = lines.map((l) => refunded.get(lineKey(l.productId, l.variantSku)) ?? 0);
      out.refunds = refunds.map((r) => listItem(tenantId, r));
    }
    return out;
  }

  router.get('/', handler((req, res) => {
    const { storeId, from, to, search, page, limit } = req.query as Record<string, string | undefined>;
    const where = ['tenant_id = ?'];
    const args: unknown[] = [req.auth!.tenantId];
    if (storeId) { where.push('store_id = ?'); args.push(storeId); }
    if (from) { where.push('created_at_local >= ?'); args.push(toIso(from)); }
    if (to) { where.push('created_at_local <= ?'); args.push(toIso(to)); }
    if (search) { where.push("number LIKE ? ESCAPE '\\'"); args.push(likePattern(search)); }
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    const total = (db.prepare(`SELECT COUNT(*) c FROM sales WHERE ${where.join(' AND ')}`).get(...args) as any).c;
    const rows = db.prepare(`SELECT * FROM sales WHERE ${where.join(' AND ')} ORDER BY created_at_local DESC LIMIT ? OFFSET ?`)
      .all(...args, l, (p - 1) * l) as any[];
    res.json({ sales: rows.map((s) => listItem(req.auth!.tenantId, s)), total });
  }));

  router.get('/:id', handler((req, res) => {
    const sale = detail(req.auth!.tenantId, req.params.id);
    if (!sale) throw new HttpError(404, 'Vente introuvable.');
    res.json({ sale });
  }));

  router.post('/:id/refund', handler((req, res) => {
    const tenantId = req.auth!.tenantId;
    const input = req.body as CreateRefundInput;
    const original: any = db.prepare('SELECT * FROM sales WHERE tenant_id = ? AND id = ?').get(tenantId, req.params.id);
    if (!original) throw new HttpError(400, 'Vente introuvable.');
    if (original.type !== 'sale') throw new HttpError(400, "Seule une vente d'origine peut faire l'objet d'un retour.");
    if (original.status !== 'completed') throw new HttpError(400, "Cette vente n'est pas dans un état permettant un retour.");
    if (!input?.lines?.length) throw new HttpError(400, 'Sélectionnez au moins une ligne à retourner.');

    const originalLines: SaleLine[] = JSON.parse(original.lines);
    const prior = db.prepare("SELECT lines FROM sales WHERE tenant_id = ? AND refund_of = ? AND type = 'refund'").all(tenantId, original.id) as any[];
    const already = new Map<string, number>();
    for (const r of prior) {
      for (const l of JSON.parse(r.lines) as SaleLine[]) {
        const k = lineKey(l.productId, l.variantSku);
        already.set(k, (already.get(k) ?? 0) + l.quantity);
      }
    }

    const refundLines: SaleLine[] = [];
    for (const requested of input.lines) {
      if (requested.quantity <= 0) throw new HttpError(400, 'La quantité à retourner doit être positive.');
      const ol = originalLines.find((l) => l.productId === requested.productId && (l.variantSku ?? undefined) === (requested.variantSku ?? undefined));
      if (!ol) throw new HttpError(400, 'Une des lignes sélectionnées ne fait pas partie de cette vente.');
      const remaining = ol.quantity - (already.get(lineKey(ol.productId, ol.variantSku)) ?? 0);
      if (requested.quantity > remaining) {
        throw new HttpError(400, `Quantité demandée pour "${ol.name.fr}" supérieure à la quantité restant à retourner (${remaining}).`);
      }
      const netUnit = Math.round(ol.lineTotalCents / ol.quantity);
      refundLines.push({
        productId: requested.productId, variantSku: requested.variantSku, name: ol.name, quantity: requested.quantity,
        unitPriceCents: ol.unitPriceCents, costPriceCents: ol.costPriceCents, taxRate: ol.taxRate, discountCents: 0,
        lineTotalCents: netUnit * requested.quantity,
      });
    }

    const grand = refundLines.reduce((s, l) => s + l.lineTotalCents, 0);
    const tax = refundLines.reduce((s, l) => s + Math.round((l.lineTotalCents * l.taxRate) / (100 + l.taxRate)), 0);
    const totals: SaleTotals = { subtotalCents: grand - tax, taxTotalCents: tax, stampDutyCents: 0, discountTotalCents: 0, grandTotalCents: grand };
    const id = newId();
    const now = nowIso();

    db.transaction(() => {
      db.prepare(`INSERT INTO sales (id, tenant_id, store_id, register_id, cashier_id, number, type, refund_of, lines, payments, totals, grand_total_cents, tax_total_cents, stamp_duty_cents, status, client_generated_id, created_at_local, synced_at, created_at)
        VALUES (?,?,?,?,?,?,'refund',?,?,?,?,?,?,0,'completed',?,?,?,?)`).run(
        id, tenantId, original.store_id, 'BACKOFFICE', req.auth!.sub, `${original.number}-RET${prior.length + 1}`, original.id,
        JSON.stringify(refundLines), JSON.stringify([{ method: input.paymentMethod, amountCents: grand }]), JSON.stringify(totals),
        grand, tax, newId(), now, now, now);
      if (input.restock) {
        const ins = db.prepare(`INSERT INTO stock_movements (id, tenant_id, store_id, product_id, variant_sku, type, quantity_delta, note, source_type, source_id, client_generated_id, created_at_local, created_at)
          VALUES (?,?,?,?,?,'refund',?,?,'sale',?,?,?,?)`);
        for (const l of refundLines) {
          ins.run(newId(), tenantId, original.store_id, l.productId, l.variantSku ?? null, l.quantity, input.note || 'Retour client', id, newId(), now, now);
        }
      }
    })();
    res.status(201).json({ sale: detail(tenantId, id) });
  }));

  return router;
}
