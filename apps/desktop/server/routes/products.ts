import { Router } from 'express';
import type { ProductDTO, ProductInput } from '@pos-dz/shared';
import { Ctx, HttpError, bool, handler, newId, nowIso, requireRole } from '../util';

export function productDTO(r: any, canViewPurchasePrice = true): ProductDTO {
  return {
    id: r.id,
    sku: r.sku,
    barcode: r.barcode ?? undefined,
    name: { fr: r.name_fr, ar: r.name_ar ?? undefined },
    category: r.category ?? undefined,
    imageUrl: r.image_url ?? undefined,
    unit: r.unit,
    variants: JSON.parse(r.variants),
    sellingPriceCents: r.selling_price_cents,
    costPriceCents: canViewPurchasePrice ? r.cost_price_cents ?? 0 : 0,
    minSellingPriceCents: r.min_selling_price_cents ?? undefined,
    promoPriceCents: r.promo_price_cents ?? undefined,
    promoStart: r.promo_start ?? undefined,
    promoEnd: r.promo_end ?? undefined,
    soldByWeight: Boolean(r.sold_by_weight),
    taxRate: r.tax_rate,
    isPerishable: Boolean(r.is_perishable),
    lowStockThreshold: r.low_stock_threshold ?? undefined,
    active: Boolean(r.active),
  };
}

const COLUMNS: Record<string, (v: any) => [string, unknown]> = {
  sku: (v) => ['sku', String(v).trim()],
  barcode: (v) => ['barcode', v ? String(v).trim() : null],
  name: (v) => ['name_fr', v?.fr],
  category: (v) => ['category', v || null],
  imageUrl: (v) => ['image_url', v || null],
  unit: (v) => ['unit', v || 'unité'],
  variants: (v) => ['variants', JSON.stringify(v ?? [])],
  sellingPriceCents: (v) => ['selling_price_cents', v],
  costPriceCents: (v) => ['cost_price_cents', v ?? 0],
  minSellingPriceCents: (v) => ['min_selling_price_cents', v ?? null],
  promoPriceCents: (v) => ['promo_price_cents', v ?? null],
  promoStart: (v) => ['promo_start', v || null],
  promoEnd: (v) => ['promo_end', v || null],
  soldByWeight: (v) => ['sold_by_weight', bool(v)],
  taxRate: (v) => ['tax_rate', v],
  isPerishable: (v) => ['is_perishable', bool(v)],
  lowStockThreshold: (v) => ['low_stock_threshold', v ?? null],
  active: (v) => ['active', bool(v)],
};

function toColumns(input: Partial<ProductInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'name') {
      out.name_fr = (value as any)?.fr;
      out.name_ar = (value as any)?.ar || null;
    } else if (COLUMNS[key]) {
      const [col, v] = COLUMNS[key](value);
      out[col] = v;
    }
  }
  return out;
}

export function productsRouter({ db }: Ctx) {
  const router = Router();
  const writers = requireRole('store_admin', 'stock_manager', 'super_admin');

  const uniqueGuard = (fn: () => void) => {
    try {
      fn();
    } catch (err: any) {
      if (String(err?.code).startsWith('SQLITE_CONSTRAINT')) throw new HttpError(409, 'Un produit avec ce SKU existe déjà.');
      throw err;
    }
  };

  router.get('/', handler((req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const canView = req.auth!.role !== 'cashier' || Boolean(req.auth!.canViewPurchasePrice);
    let rows = db.prepare('SELECT * FROM products WHERE tenant_id = ? ORDER BY name_fr COLLATE NOCASE').all(req.auth!.tenantId) as any[];
    if (search) {
      rows = rows.filter((r) =>
        [r.name_fr, r.name_ar, r.sku, r.barcode].some((f) => f && String(f).toLowerCase().includes(search)),
      );
    }
    res.json({ products: rows.map((r) => productDTO(r, canView)) });
  }));

  router.post('/', writers, handler((req, res) => {
    const input = req.body as ProductInput;
    if (!input?.sku || !input?.name?.fr || typeof input.sellingPriceCents !== 'number') {
      throw new HttpError(400, 'sku, nom (fr) et prix de vente sont requis.');
    }
    const id = newId();
    const now = nowIso();
    const cols = {
      unit: 'unité', variants: '[]', cost_price_cents: 0, tax_rate: 19, is_perishable: 0, active: 1,
      ...toColumns(input),
    };
    uniqueGuard(() => {
      const keys = Object.keys(cols);
      db.prepare(`INSERT INTO products (id, tenant_id, created_at, updated_at, ${keys.join(',')}) VALUES (?,?,?,?,${keys.map(() => '?').join(',')})`)
        .run(id, req.auth!.tenantId, now, now, ...Object.values(cols) as any[]);
    });
    res.status(201).json({ product: productDTO(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
  }));

  router.patch('/:id', writers, handler((req, res) => {
    const cols = toColumns(req.body ?? {});
    const keys = Object.keys(cols);
    const exists = db.prepare('SELECT 1 FROM products WHERE tenant_id = ? AND id = ?').get(req.auth!.tenantId, req.params.id);
    if (!exists) throw new HttpError(404, 'Produit introuvable.');
    uniqueGuard(() => {
      db.prepare(`UPDATE products SET updated_at = ?${keys.map((k) => `, ${k} = ?`).join('')} WHERE tenant_id = ? AND id = ?`)
        .run(nowIso(), ...Object.values(cols) as any[], req.auth!.tenantId, req.params.id);
    });
    res.json({ product: productDTO(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)) });
  }));

  router.delete('/:id', writers, handler((req, res) => {
    if (req.query.permanent === 'true') {
      // Suppression définitive : uniquement pour un produit sans historique (voir apps/api products.service.deleteProductPermanently).
      const tenantId = req.auth!.tenantId;
      const id = req.params.id;
      if (!db.prepare('SELECT 1 FROM products WHERE tenant_id = ? AND id = ?').get(tenantId, id)) throw new HttpError(404, 'Produit introuvable.');
      const like = `%"${id}"%`; // identifiants UUID : présents entre guillemets dans le JSON des lignes
      const used =
        db.prepare('SELECT 1 FROM sales WHERE tenant_id = ? AND lines LIKE ? LIMIT 1').get(tenantId, like) ||
        db.prepare('SELECT 1 FROM business_documents WHERE tenant_id = ? AND lines LIKE ? LIMIT 1').get(tenantId, like) ||
        db.prepare("SELECT 1 FROM stock_movements WHERE tenant_id = ? AND product_id = ? AND type <> 'adjustment' LIMIT 1").get(tenantId, id);
      if (used) {
        throw new HttpError(409, "Suppression impossible : ce produit apparaît dans l'historique (ventes, documents ou mouvements de stock). Désactivez-le à la place.");
      }
      db.transaction(() => {
        db.prepare("DELETE FROM stock_movements WHERE tenant_id = ? AND product_id = ? AND type = 'adjustment'").run(tenantId, id);
        db.prepare('DELETE FROM products WHERE tenant_id = ? AND id = ?').run(tenantId, id);
        db.prepare("INSERT INTO deleted_records (id, tenant_id, kind, ref_id, deleted_at) VALUES (?,?,'product',?,?)").run(newId(), tenantId, id, nowIso());
      })();
      return res.status(204).send();
    }
    const r = db.prepare('UPDATE products SET active = 0, updated_at = ? WHERE tenant_id = ? AND id = ?').run(nowIso(), req.auth!.tenantId, req.params.id);
    if (!r.changes) throw new HttpError(404, 'Produit introuvable.');
    res.status(204).send();
  }));

  return router;
}

/** Moyenne pondérée incrémentale du coût d'achat (voir apps/api products.service.recomputeCostPrice). */
export function recomputeCostPrice(db: Ctx['db'], tenantId: string, productId: string, qtyBefore: number, purchaseQty: number, unitCost: number) {
  const p = db.prepare('SELECT cost_price_cents FROM products WHERE tenant_id = ? AND id = ?').get(tenantId, productId) as any;
  if (!p) throw new HttpError(404, 'Produit introuvable.');
  const prior = Math.max(0, qtyBefore);
  const next = prior > 0 ? Math.round((prior * (p.cost_price_cents ?? 0) + purchaseQty * unitCost) / (prior + purchaseQty)) : unitCost;
  db.prepare('UPDATE products SET cost_price_cents = ?, updated_at = ? WHERE tenant_id = ? AND id = ?').run(next, nowIso(), tenantId, productId);
}
