import { Router } from 'express';
import { journalEntryFromInvoice, journalEntryFromSale } from '@pos-dz/shared';
import type { JournalEntryDTO, SaleLine, SalePayment, TaxReturnDTO, DebtorDTO, DebtsSummaryDTO, ProfitSummaryDTO, SalesSummaryDTO, TopProductDTO } from '@pos-dz/shared';
import { Ctx, HttpError, handler, toIso } from '../util';

/** Algérie = UTC+1 toute l'année (pas d'heure d'été) — les journées commerciales se regroupent sur ce décalage. */
const DAY_OFFSET = '+1 hours';

function parseRange(q: Record<string, string | undefined>) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { storeId: q.storeId, from: toIso(from), to: toIso(to) };
}

export function reportsRouter({ db }: Ctx) {
  const router = Router();

  function filter(tenantId: string, r: ReturnType<typeof parseRange>, type: 'sale' | 'refund') {
    let where = "s.tenant_id = ? AND s.created_at_local >= ? AND s.created_at_local <= ? AND s.type = ? AND s.status = 'completed'";
    const args: unknown[] = [tenantId, r.from, r.to, type];
    if (r.storeId) { where += ' AND s.store_id = ?'; args.push(r.storeId); }
    return { where, args };
  }

  router.get('/summary', handler((req, res) => {
    const range = parseRange(req.query as any);
    const tid = req.auth!.tenantId;
    const sales = filter(tid, range, 'sale');
    const refunds = filter(tid, range, 'refund');

    const t: any = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(grand_total_cents),0) gross, COALESCE(SUM(tax_total_cents),0) tax, COALESCE(SUM(stamp_duty_cents),0) stamp FROM sales s WHERE ${sales.where}`).get(...sales.args);
    const rf: any = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(grand_total_cents),0) total FROM sales s WHERE ${refunds.where}`).get(...refunds.args);
    const byDay = db.prepare(`SELECT date(created_at_local, '${DAY_OFFSET}') d, SUM(grand_total_cents) revenue, COUNT(*) n FROM sales s WHERE ${sales.where} GROUP BY d ORDER BY d`).all(...sales.args) as any[];
    const byMethod = db.prepare(`SELECT json_extract(p.value, '$.method') method, SUM(json_extract(p.value, '$.amountCents')) amount
      FROM sales s, json_each(s.payments) p WHERE ${sales.where} GROUP BY method ORDER BY amount DESC`).all(...sales.args) as any[];

    const summary: SalesSummaryDTO = {
      salesCount: t.n,
      grossRevenueCents: t.gross,
      refundsCents: rf.total,
      refundsCount: rf.n,
      netRevenueCents: t.gross - rf.total,
      taxCollectedCents: t.tax,
      stampDutyCents: t.stamp,
      averageBasketCents: t.n > 0 ? Math.round(t.gross / t.n) : 0,
      revenueByDay: byDay.map((d) => ({ date: d.d, revenueCents: d.revenue, salesCount: d.n })),
      revenueByPaymentMethod: byMethod.map((m) => ({ method: m.method, amountCents: m.amount })),
    };
    res.json({ summary });
  }));

  router.get('/top-products', handler((req, res) => {
    const { limit, ...rest } = req.query as Record<string, string | undefined>;
    const f = filter(req.auth!.tenantId, parseRange(rest), 'sale');
    const rows = db.prepare(`SELECT json_extract(l.value,'$.productId') pid, MIN(json_extract(l.value,'$.name.fr')) name_fr, MIN(json_extract(l.value,'$.name.ar')) name_ar,
      SUM(json_extract(l.value,'$.quantity')) qty, SUM(json_extract(l.value,'$.lineTotalCents')) revenue
      FROM sales s, json_each(s.lines) l WHERE ${f.where} GROUP BY pid ORDER BY revenue DESC LIMIT ?`).all(...f.args, limit ? parseInt(limit, 10) : 10) as any[];
    const products: TopProductDTO[] = rows.map((r) => ({
      productId: r.pid, name: { fr: r.name_fr, ar: r.name_ar ?? undefined }, quantity: r.qty, revenueCents: r.revenue,
    }));
    res.json({ products });
  }));

  router.get('/profit', handler((req, res) => {
    const range = parseRange(req.query as any);
    const net = (type: 'sale' | 'refund') => {
      const f = filter(req.auth!.tenantId, range, type);
      const r: any = db.prepare(`SELECT
        COALESCE(SUM(json_extract(l.value,'$.lineTotalCents') - json_extract(l.value,'$.lineTotalCents') * json_extract(l.value,'$.taxRate') * 1.0 / (100 + json_extract(l.value,'$.taxRate'))),0) revenue,
        COALESCE(SUM(json_extract(l.value,'$.costPriceCents') * json_extract(l.value,'$.quantity')),0) cost
        FROM sales s, json_each(s.lines) l WHERE ${f.where}`).get(...f.args);
      return { revenue: Math.round(r.revenue), cost: r.cost };
    };
    const s = net('sale');
    const rf = net('refund');
    const revenueCents = s.revenue - rf.revenue;
    const costCents = s.cost - rf.cost;
    const grossProfitCents = revenueCents - costCents;
    const profit: ProfitSummaryDTO = {
      revenueCents, costCents, grossProfitCents,
      marginPercent: revenueCents > 0 ? Math.round((grossProfitCents / revenueCents) * 1000) / 10 : 0,
    };
    res.json({ profit });
  }));

  router.get('/debts', handler((req, res) => {
    const tid = req.auth!.tenantId;
    const top = (kind: 'customer' | 'supplier', table: string) => {
      const rows = db.prepare(`SELECT party_id id, SUM(amount_cents) balance FROM ledger_entries WHERE tenant_id = ? AND party_kind = ?
        GROUP BY party_id HAVING balance > 0 ORDER BY balance DESC`).all(tid, kind) as any[];
      const names = new Map<string, string>(
        (db.prepare(`SELECT id, name FROM ${table} WHERE tenant_id = ?`).all(tid) as any[]).map((e) => [e.id, e.name]),
      );
      const topList: DebtorDTO[] = rows.slice(0, 5).map((r) => ({ id: r.id, name: names.get(r.id) ?? 'Inconnu', balanceCents: r.balance }));
      return { total: rows.reduce((s, r) => s + r.balance, 0), top: topList };
    };
    const suppliers = top('supplier', 'suppliers');
    const customers = top('customer', 'customers');
    const debts: DebtsSummaryDTO = {
      totalSupplierDebtCents: suppliers.total, totalCustomerDebtCents: customers.total,
      topSuppliers: suppliers.top, topCustomers: customers.top,
    };
    res.json({ debts });
  }));

  /** Base G50 / G12 : ventes moins retours par taux de TVA et par mois. Même formule que /profit (TVA extraite d'un TTC). */
  /** Écritures de la période (tickets, retours, factures libres) : base des exports CSV/XLSX et du récapitulatif TVA côté web. */
  router.get('/accounting-journal', handler((req, res) => {
    const range = parseRange(req.query as any);
    if (Number.isNaN(Date.parse(range.from)) || Number.isNaN(Date.parse(range.to))) throw new HttpError(400, 'Période invalide.');
    const tid = req.auth!.tenantId;
    const store = range.storeId ? ' AND store_id = ?' : '';
    const storeArg = range.storeId ? [range.storeId] : [];

    const invoices = db.prepare(`SELECT * FROM business_documents WHERE tenant_id = ? AND kind = 'invoice' AND status = 'issued' AND issue_date >= ? AND issue_date <= ?${store} ORDER BY issue_date LIMIT 50000`)
      .all(tid, range.from, range.to, ...storeArg) as any[];
    const sales = db.prepare(`SELECT * FROM sales WHERE tenant_id = ? AND status = 'completed' AND created_at_local >= ? AND created_at_local <= ?${store} ORDER BY created_at_local LIMIT 50000`)
      .all(tid, range.from, range.to, ...storeArg) as any[];

    // Facture tirée d'un ticket : rattachée à son ticket (déjà au journal), pas recomptée.
    const linked = new Map<string, string>();
    for (const r of db.prepare("SELECT sale_id, number FROM business_documents WHERE tenant_id = ? AND kind = 'invoice' AND status = 'issued' AND sale_id IS NOT NULL").all(tid) as any[]) linked.set(r.sale_id, r.number);

    const entries: JournalEntryDTO[] = sales.map((s) => journalEntryFromSale({
      date: s.created_at_local,
      type: s.type === 'refund' ? 'refund' : 'sale',
      number: s.number,
      storeId: s.store_id,
      lines: JSON.parse(s.lines) as SaleLine[],
      payments: JSON.parse(s.payments) as SalePayment[],
      stampDutyCents: s.stamp_duty_cents,
      documentNumber: linked.get(s.id),
    }));
    for (const r of invoices.filter((i) => !i.sale_id)) {
      entries.push(journalEntryFromInvoice({
        issueDate: r.issue_date, number: r.number, storeId: r.store_id ?? undefined,
        buyer: JSON.parse(r.buyer), totals: JSON.parse(r.totals), paymentMethod: r.payment_method ?? undefined,
      }));
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ entries });
  }));

  router.get('/tax-return', handler((req, res) => {
    const range = parseRange(req.query as any);
    const tid = req.auth!.tenantId;
    const where = "s.tenant_id = ? AND s.created_at_local >= ? AND s.created_at_local <= ? AND s.status = 'completed'" + (range.storeId ? ' AND s.store_id = ?' : '');
    const args: unknown[] = [tid, range.from, range.to, ...(range.storeId ? [range.storeId] : [])];
    const sign = "(CASE s.type WHEN 'refund' THEN -1 ELSE 1 END)";
    const ttc = "json_extract(l.value,'$.lineTotalCents')";
    const rate = "json_extract(l.value,'$.taxRate')";
    const tax = `(${ttc} * ${rate} * 1.0 / (100 + ${rate}))`;

    const rateRows = db.prepare(`SELECT ${rate} r, SUM(${ttc} * ${sign}) ttc, SUM(${tax} * ${sign}) tax
      FROM sales s, json_each(s.lines) l WHERE ${where} GROUP BY r ORDER BY r DESC`).all(...args) as any[];
    const monthRows = db.prepare(`SELECT strftime('%Y-%m', s.created_at_local, '${DAY_OFFSET}') m, SUM(${ttc} * ${sign}) ttc, SUM(${tax} * ${sign}) tax
      FROM sales s, json_each(s.lines) l WHERE ${where} GROUP BY m ORDER BY m`).all(...args) as any[];
    const head: any = db.prepare(`SELECT COALESCE(SUM(s.stamp_duty_cents * ${sign}),0) stamp,
      COALESCE(SUM(CASE s.type WHEN 'sale' THEN 1 ELSE 0 END),0) sales, COALESCE(SUM(CASE s.type WHEN 'refund' THEN 1 ELSE 0 END),0) refunds
      FROM sales s WHERE ${where}`).get(...args);
    const cash: any = db.prepare(`SELECT COALESCE(SUM(json_extract(p.value,'$.amountCents') * ${sign}),0) cash
      FROM sales s, json_each(s.payments) p WHERE ${where} AND json_extract(p.value,'$.method') = 'cash'`).get(...args);

    const bucket = (t: number, x: number) => ({ ttcCents: Math.round(t), taxCents: Math.round(x), baseHtCents: Math.round(t) - Math.round(x) });
    const byRate = rateRows.map((r) => ({ taxRate: r.r, ...bucket(r.ttc, r.tax) }));
    const taxReturn: TaxReturnDTO = {
      byRate,
      byMonth: monthRows.map((r) => ({ month: r.m, ...bucket(r.ttc, r.tax) })),
      totalHtCents: byRate.reduce((a, b) => a + b.baseHtCents, 0),
      totalTaxCents: byRate.reduce((a, b) => a + b.taxCents, 0),
      totalTtcCents: byRate.reduce((a, b) => a + b.ttcCents, 0),
      stampDutyCents: Math.round(head.stamp),
      cashCents: Math.round(cash.cash),
      salesCount: head.sales,
      refundsCount: head.refunds,
    };
    res.json({ taxReturn });
  }));

  return router;
}
