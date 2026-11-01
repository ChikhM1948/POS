import { Router } from 'express';
import type {
  CreatePurchaseInput, CreateStockMovementInput, ReorderGroupDTO, StockAlertsDTO, StockBalanceDTO, StockBatchDTO, StockMovementDTO,
} from '@pos-dz/shared';
import { Ctx, HttpError, handler, newId, nowIso, requireRole, toIso } from '../util';
import { DEFAULT_EXPIRY_WARNING_DAYS, batchBalances, daysUntil, touchProduct } from '../batches';
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

  /** Quantité en stock par produit actif pour une boutique (une requête, pas de N+1). */
  function quantities(tenantId: string, storeId: string) {
    return db.prepare(`
      SELECT p.*, COALESCE((SELECT SUM(quantity_delta) FROM stock_movements m
        WHERE m.tenant_id = p.tenant_id AND m.store_id = ? AND m.product_id = p.id), 0) AS quantity
      FROM products p WHERE p.tenant_id = ? AND p.active = 1`).all(storeId, tenantId) as any[];
  }

  const warningDays = (req: { query: Record<string, unknown> }) => {
    const n = parseInt(String(req.query.days ?? ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_EXPIRY_WARNING_DAYS;
  };

  /** Lots encore en stock, triés par péremption (le plus urgent d'abord) — base du FEFO et des alertes. */
  router.get('/batches', handler((req, res) => {
    const storeId = req.query.storeId as string | undefined;
    if (!storeId) throw new HttpError(400, 'storeId est requis.');
    const tenantId = req.auth!.tenantId;
    const products = new Map<string, any>(
      (db.prepare('SELECT id, sku, name_fr, name_ar, unit FROM products WHERE tenant_id = ?').all(tenantId) as any[]).map((p) => [p.id, p]),
    );
    const batches: StockBatchDTO[] = [];
    for (const b of batchBalances(db, tenantId, storeId)) {
      const p = products.get(b.product_id);
      if (!p) continue;
      batches.push({
        productId: p.id, sku: p.sku, name: { fr: p.name_fr, ar: p.name_ar ?? undefined }, unit: p.unit,
        lotNumber: b.lot_number ?? undefined, expiryDate: b.expiry_date ?? undefined, quantity: b.quantity,
        daysLeft: b.expiry_date ? daysUntil(b.expiry_date) : undefined,
      });
    }
    res.json({ batches, expiryWarningDays: warningDays(req) });
  }));

  /** Compteurs pour les pastilles d'alerte (menu back-office). */
  router.get('/alerts', handler((req, res) => {
    const storeId = req.query.storeId as string | undefined;
    if (!storeId) throw new HttpError(400, 'storeId est requis.');
    const tenantId = req.auth!.tenantId;
    const days = warningDays(req);
    let low = 0, out = 0;
    for (const p of quantities(tenantId, storeId)) {
      if (p.low_stock_threshold > 0 && p.quantity <= p.low_stock_threshold) low++;
      if (p.quantity <= 0 && p.low_stock_threshold > 0) out++;
    }
    let expired = 0, soon = 0;
    for (const b of batchBalances(db, tenantId, storeId)) {
      if (!b.expiry_date) continue;
      const left = daysUntil(b.expiry_date);
      if (left < 0) expired++;
      else if (left <= days) soon++;
    }
    const alerts: StockAlertsDTO = { lowStockCount: low, outOfStockCount: out, expiringSoonCount: soon, expiredCount: expired, expiryWarningDays: days };
    res.json({ alerts });
  }));

  /**
   * Liste de réapprovisionnement : produits sous leur seuil, groupés par fournisseur (le dernier
   * fournisseur chez qui le produit a été acheté). Quantité suggérée = remonter à 2× le seuil.
   */
  router.get('/reorder', handler((req, res) => {
    const storeId = req.query.storeId as string | undefined;
    if (!storeId) throw new HttpError(400, 'storeId est requis.');
    const tenantId = req.auth!.tenantId;
    const lastPurchase = db.prepare(`SELECT supplier_id, unit_cost_cents FROM stock_movements
      WHERE tenant_id = ? AND product_id = ? AND type = 'purchase' AND supplier_id IS NOT NULL
      ORDER BY created_at_local DESC LIMIT 1`);
    const suppliers = new Map<string, any>(
      (db.prepare('SELECT * FROM suppliers WHERE tenant_id = ? AND active = 1').all(tenantId) as any[]).map((s) => [s.id, s]),
    );
    const groups = new Map<string, ReorderGroupDTO>();
    for (const p of quantities(tenantId, storeId)) {
      const threshold = p.low_stock_threshold;
      if (!(threshold > 0) || p.quantity > threshold) continue;
      const last = lastPurchase.get(tenantId, p.id) as any;
      const supplier = last && suppliers.get(last.supplier_id);
      const key = supplier ? supplier.id : '';
      if (!groups.has(key)) {
        groups.set(key, {
          supplierId: supplier?.id ?? null, supplierName: supplier?.name ?? null, supplierPhone: supplier?.phone ?? undefined, items: [],
        });
      }
      groups.get(key)!.items.push({
        productId: p.id, sku: p.sku, name: { fr: p.name_fr, ar: p.name_ar ?? undefined }, unit: p.unit, quantity: p.quantity,
        lowStockThreshold: threshold, suggestedQuantity: Math.max(1, Math.ceil(threshold * 2 - p.quantity)),
        lastUnitCostCents: last?.unit_cost_cents ?? p.cost_price_cents ?? 0,
      });
    }
    const list = [...groups.values()].sort((a, b) => (a.supplierName ?? '\uffff').localeCompare(b.supplierName ?? '\uffff'));
    for (const g of list) g.items.sort((a, b) => a.name.fr.localeCompare(b.name.fr));
    res.json({ groups: list });
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
    if (input.expiryDate || input.lotNumber) touchProduct(db, req.auth!.tenantId, productId);
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
      recomputeCostPrice(db, tenantId, productId, currentQty, qty, unitCostCents); // touche aussi updated_at
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
