import { Router } from 'express';
import type { CreatePurchaseInput, CreateStockMovementInput, StockBalanceDTO, StockMovementDTO } from '@pos-dz/shared';
import { Ctx, HttpError, handler, newId, nowIso, requireRole, toIso } from '../util';
import { recomputeCostPrice } from './products';

function movementDTO(m: any): StockMovementDTO {
  return {
    id: m.id,
    productId: m.product_id,
    variantSku: m.variant_sku ?? undefined,
    storeId: m.store_id,
    type: m.type,
    quantityDelta: m.quantity_delta,
    unitCostCents: m.unit_cost_cents ?? undefined,
    lotNumber: m.lot_number ?? undefined,
    expiryDate: m.expiry_date ?? undefined,
    note: m.note ?? undefined,
    createdAtLocal: m.created_at_local,
  };
}

export function stockRouter({ db }: Ctx) {
  const router = Router();
  const writers = requireRole('store_admin', 'stock_manager', 'super_admin');

  const insert = db.prepare(`INSERT INTO stock_movements
    (id, tenant_id, store_id, product_id, variant_sku, type, quantity_delta, unit_cost_cents, supplier_id, lot_number, expiry_date, note, client_generated_id, created_at_local, created_at)
    VALUES (@id, @tenant_id, @store_id, @product_id, @variant_sku, @type, @quantity_delta, @unit_cost_cents, @supplier_id, @lot_number, @expiry_date, @note, @cgid, @now, @now)`);

  const quantityOf = (tenantId: string, storeId: string, productId: string): number =>
    (db.prepare('SELECT COALESCE(SUM(quantity_delta),0) q FROM stock_movements WHERE tenant_id = ? AND store_id = ? AND product_id = ?')
      .get(tenantId, storeId, productId) as any).q;

  router.get('/balances', handler((req, res) => {
    const storeId = req.query.storeId as string | undefined;
    if (!storeId) throw new HttpError(400, 'storeId est requis.');
    const rows = db.prepare(`
      SELECT p.*, COALESCE((SELECT SUM(quantity_delta) FROM stock_movements m
        WHERE m.tenant_id = p.tenant_id AND m.store_id = ? AND m.product_id = p.id), 0) AS quantity
      FROM products p WHERE p.tenant_id = ? AND p.active = 1`).all(storeId, req.auth!.tenantId) as any[];
    const balances: StockBalanceDTO[] = rows.map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: { fr: p.name_fr, ar: p.name_ar ?? undefined },
      unit: p.unit,
      isPerishable: Boolean(p.is_perishable),
      lowStockThreshold: p.low_stock_threshold ?? undefined,
      quantity: p.quantity,
    }));
    res.json({ balances });
  }));

  router.get('/movements', handler((req, res) => {
    const { storeId, productId } = req.query as Record<string, string | undefined>;
    if (!storeId || !productId) throw new HttpError(400, 'storeId et productId sont requis.');
    const rows = db.prepare(`SELECT * FROM stock_movements WHERE tenant_id = ? AND store_id = ? AND product_id = ?
      ORDER BY created_at_local DESC LIMIT 100`).all(req.auth!.tenantId, storeId, productId);
    res.json({ movements: rows.map(movementDTO) });
  }));

  router.post('/movements', writers, handler((req, res) => {
    const input = req.body as CreateStockMovementInput;
    const { productId, storeId, type, quantityDelta } = input ?? ({} as CreateStockMovementInput);
    if (!productId || !storeId || !type || typeof quantityDelta !== 'number' || quantityDelta === 0) {
      throw new HttpError(400, 'productId, storeId, type et quantityDelta (non nul) sont requis.');
    }
    const id = newId();
    insert.run({
      id, tenant_id: req.auth!.tenantId, store_id: storeId, product_id: productId, variant_sku: input.variantSku ?? null,
      type, quantity_delta: quantityDelta, unit_cost_cents: null, supplier_id: null, lot_number: input.lotNumber ?? null,
      expiry_date: input.expiryDate ? toIso(input.expiryDate) : null, note: input.note ?? null, cgid: newId(), now: nowIso(),
    });
    res.status(201).json({ movement: movementDTO(db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id)) });
  }));

  router.post('/purchases', writers, handler((req, res) => {
    const input = req.body as CreatePurchaseInput;
    const { productId, storeId, quantity, unitCostCents, paidCents } = input ?? ({} as CreatePurchaseInput);
    if (!productId || !storeId || !quantity || quantity <= 0 || typeof unitCostCents !== 'number' || unitCostCents < 0) {
      throw new HttpError(400, 'productId, storeId, quantity (positive) et unitCostCents sont requis.');
    }
    if (typeof paidCents !== 'number' || paidCents < 0) throw new HttpError(400, 'paidCents doit être un montant positif ou nul.');

    const tenantId = req.auth!.tenantId;
    const qty = Math.abs(quantity);
    const total = qty * unitCostCents;
    const paid = Math.min(Math.max(0, paidCents), total);
    const id = newId();
    const now = nowIso();

    db.transaction(() => {
      const currentQty = quantityOf(tenantId, storeId, productId);
      insert.run({
        id, tenant_id: tenantId, store_id: storeId, product_id: productId, variant_sku: input.variantSku ?? null,
        type: 'purchase', quantity_delta: qty, unit_cost_cents: unitCostCents, supplier_id: input.supplierId ?? null,
        lot_number: input.lotNumber ?? null, expiry_date: input.expiryDate ? toIso(input.expiryDate) : null,
        note: input.note ?? null, cgid: newId(), now,
      });
      recomputeCostPrice(db, tenantId, productId, currentQty, qty, unitCostCents);
      if (input.supplierId && total - paid > 0) {
        db.prepare(`INSERT INTO ledger_entries (id, tenant_id, party_kind, party_id, type, amount_cents, note, ref_type, ref_id, client_generated_id, created_at_local, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(newId(), tenantId, 'supplier', input.supplierId, 'purchase_on_credit', total - paid,
          input.note ?? null, 'purchase', id, newId(), now, now);
      }
    })();
    res.status(201).json({ movement: movementDTO(db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(id)) });
  }));

  return router;
}
