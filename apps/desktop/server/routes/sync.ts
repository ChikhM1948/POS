import { Router } from 'express';
import type { SyncOperation, SyncPushRequest, SyncPushResponse, SyncPushResult } from '@pos-dz/shared';
import { Ctx, HttpError, handler, newId, nowIso, toIso } from '../util';

export function syncRouter({ db }: Ctx) {
  const router = Router();

  const insertSale = db.prepare(`INSERT OR IGNORE INTO sales
    (id, tenant_id, store_id, register_id, cashier_id, number, type, lines, payments, totals, grand_total_cents, tax_total_cents, stamp_duty_cents, status, client_generated_id, created_at_local, synced_at, created_at)
    VALUES (@id, @tenant_id, @store_id, @register_id, @cashier_id, @number, 'sale', @lines, @payments, @totals, @grand, @tax, @stamp, 'completed', @cgid, @created_local, @now, @now)`);
  const insertMovement = db.prepare(`INSERT OR IGNORE INTO stock_movements
    (id, tenant_id, store_id, product_id, variant_sku, type, quantity_delta, unit_cost_cents, supplier_id, lot_number, expiry_date, note, source_type, source_id, client_generated_id, created_at_local, created_at)
    VALUES (@id, @tenant_id, @store_id, @product_id, @variant_sku, @type, @quantity_delta, @unit_cost, @supplier_id, @lot, @expiry, @note, @source_type, @source_id, @cgid, @created_local, @now)`);
  const insertLedger = db.prepare(`INSERT INTO ledger_entries
    (id, tenant_id, party_kind, party_id, type, amount_cents, ref_type, ref_id, client_generated_id, created_at_local, created_at)
    VALUES (?,?,'customer',?,'sale_credit',?,'sale',?,?,?,?)`);
  const logOp = db.prepare(`INSERT INTO sync_log (tenant_id, client_generated_id, device_id, entity_type, status, error, received_at, applied_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (tenant_id, client_generated_id) DO UPDATE SET status = excluded.status, error = excluded.error, applied_at = excluded.applied_at`);

  /** Idempotent : rejouer le même clientGeneratedId ne crée jamais de doublon (INSERT OR IGNORE + log). */
  function applyOperation(tenantId: string, deviceId: string, op: SyncOperation): SyncPushResult {
    try {
      const done = db.prepare("SELECT status FROM sync_log WHERE tenant_id = ? AND client_generated_id = ?").get(tenantId, op.clientGeneratedId) as any;
      if (done?.status === 'applied') return { clientGeneratedId: op.clientGeneratedId, status: 'already_applied' };

      const now = nowIso();
      const createdLocal = toIso(op.createdAtLocal);
      let serverId = '';
      db.transaction(() => {
        const p = op.payload as any;
        if (op.entityType === 'sale') {
          serverId = newId();
          const r = insertSale.run({
            id: serverId, tenant_id: tenantId, store_id: p.storeId, register_id: p.registerId, cashier_id: p.cashierId, number: p.number,
            lines: JSON.stringify(p.lines ?? []), payments: JSON.stringify(p.payments ?? []), totals: JSON.stringify(p.totals),
            grand: p.totals.grandTotalCents, tax: p.totals.taxTotalCents, stamp: p.totals.stampDutyCents ?? 0,
            cgid: op.clientGeneratedId, created_local: createdLocal, now,
          });
          if (r.changes) {
            for (const pay of p.payments ?? []) {
              if (pay.method === 'credit' && pay.customerId && pay.amountCents > 0) {
                insertLedger.run(newId(), tenantId, pay.customerId, pay.amountCents, serverId, newId(), createdLocal, now);
              }
            }
          } else {
            serverId = (db.prepare('SELECT id FROM sales WHERE tenant_id = ? AND client_generated_id = ?').get(tenantId, op.clientGeneratedId) as any).id;
          }
        } else if (op.entityType === 'stockMovement') {
          serverId = newId();
          const r = insertMovement.run({
            id: serverId, tenant_id: tenantId, store_id: p.storeId, product_id: p.productId, variant_sku: p.variantSku ?? null,
            type: p.type, quantity_delta: p.quantityDelta, unit_cost: p.unitCostCents ?? null, supplier_id: p.supplierId ?? null,
            lot: p.lotNumber ?? null, expiry: p.expiryDate ? toIso(p.expiryDate) : null, note: p.note ?? null,
            source_type: p.sourceDocument?.type ?? null, source_id: p.sourceDocument?.id ?? null,
            cgid: op.clientGeneratedId, created_local: createdLocal, now,
          });
          if (!r.changes) {
            serverId = (db.prepare('SELECT id FROM stock_movements WHERE tenant_id = ? AND client_generated_id = ?').get(tenantId, op.clientGeneratedId) as any).id;
          }
        } else {
          throw new Error(`Type d'entité inconnu: ${op.entityType}`);
        }
        logOp.run(tenantId, op.clientGeneratedId, deviceId, op.entityType, 'applied', null, now, now);
      })();
      return { clientGeneratedId: op.clientGeneratedId, status: 'applied', serverId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      logOp.run(tenantId, op.clientGeneratedId, deviceId, op.entityType, 'rejected', message, nowIso(), null);
      return { clientGeneratedId: op.clientGeneratedId, status: 'rejected', error: message };
    }
  }

  router.post('/push', handler((req, res) => {
    const { tenantId, deviceId, operations } = (req.body ?? {}) as SyncPushRequest;
    if (!tenantId || !deviceId || !Array.isArray(operations)) throw new HttpError(400, 'tenantId, deviceId et operations[] sont requis.');
    if (tenantId !== req.auth?.tenantId) throw new HttpError(403, 'tenantId ne correspond pas au token authentifié.');
    const response: SyncPushResponse = {
      results: operations.map((op) => applyOperation(tenantId, deviceId, op)),
      serverTime: nowIso(),
    };
    res.json(response);
  }));

  /** Référentiel local → cache Dexie de la caisse (forme compatible avec sync-engine.ts : `_id`, `name.fr`...). */
  router.get('/pull', handler((req, res) => {
    const { tenantId, since } = req.query as { tenantId?: string; since?: string };
    if (!tenantId) throw new HttpError(400, 'tenantId est requis.');
    if (tenantId !== req.auth?.tenantId) throw new HttpError(403, 'tenantId ne correspond pas au token authentifié.');
    const sinceIso = since ? toIso(since) : new Date(0).toISOString();
    const serverTime = nowIso();

    const products = (db.prepare('SELECT * FROM products WHERE tenant_id = ? AND updated_at > ?').all(tenantId, sinceIso) as any[]).map((r) => ({
      _id: r.id, sku: r.sku, barcode: r.barcode ?? undefined, name: { fr: r.name_fr, ar: r.name_ar ?? undefined },
      category: r.category ?? undefined, imageUrl: r.image_url ?? undefined, sellingPriceCents: r.selling_price_cents,
      costPriceCents: req.auth!.role !== 'cashier' || req.auth!.canViewPurchasePrice ? r.cost_price_cents : 0,
      minSellingPriceCents: r.min_selling_price_cents ?? undefined, taxRate: r.tax_rate, unit: r.unit, updatedAt: r.updated_at,
      active: Boolean(r.active),
    }));
    const customers = (db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND active = 1 AND updated_at > ?').all(tenantId, sinceIso) as any[])
      .map((r) => ({ _id: r.id, name: r.name, phone: r.phone ?? undefined }));
    res.json({ products, customers, serverTime });
  }));

  return router;
}
