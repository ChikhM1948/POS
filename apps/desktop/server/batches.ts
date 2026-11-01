import type { Db } from './db';
import { nowIso } from './util';

/** Jours par défaut avant péremption à partir desquels un lot est signalé « bientôt périmé ». */
export const DEFAULT_EXPIRY_WARNING_DAYS = 30;

export interface BatchRow {
  product_id: string;
  lot_number: string | null;
  expiry_date: string | null;
  quantity: number;
}

const DAY_MS = 86_400_000;

/** Jours entiers entre aujourd'hui (date locale) et la date de péremption (négatif = périmé). */
export function daysUntil(expiryIso: string, now = new Date()): number {
  const e = new Date(expiryIso);
  const expiry = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry - today) / DAY_MS);
}

/**
 * Soldes par lot (numéro de lot + péremption) : le stock reste un registre de mouvements, un lot
 * n'est que le regroupement des mouvements portant le même couple. Seuls les lots > 0 sont retournés.
 */
export function batchBalances(db: Db, tenantId: string, storeId: string, productId?: string): BatchRow[] {
  const rows = db.prepare(`
    SELECT product_id, lot_number, expiry_date, SUM(quantity_delta) AS quantity
    FROM stock_movements
    WHERE tenant_id = ? AND store_id = ? ${productId ? 'AND product_id = ?' : ''}
      AND (lot_number IS NOT NULL OR expiry_date IS NOT NULL)
    GROUP BY product_id, COALESCE(lot_number, ''), COALESCE(expiry_date, '')
    HAVING SUM(quantity_delta) > 0.0000001
    ORDER BY expiry_date IS NULL, expiry_date, lot_number`).all(...(productId ? [tenantId, storeId, productId] : [tenantId, storeId]));
  return rows as BatchRow[];
}

export interface Allocation {
  lotNumber: string | null;
  expiryDate: string | null;
  quantity: number; // toujours positif
}

/**
 * FEFO (First Expired, First Out) : répartit une quantité vendue sur les lots, du plus proche de la
 * péremption au plus lointain. Le reste (stock sans lot) est rendu avec lot/péremption à null.
 */
export function allocateFefo(db: Db, tenantId: string, storeId: string, productId: string, quantity: number): Allocation[] {
  const batches = batchBalances(db, tenantId, storeId, productId); // déjà triés par péremption croissante
  const out: Allocation[] = [];
  let remaining = quantity;
  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    out.push({ lotNumber: b.lot_number, expiryDate: b.expiry_date, quantity: take });
    remaining -= take;
  }
  if (remaining > 0.0000001) out.push({ lotNumber: null, expiryDate: null, quantity: remaining });
  return out;
}

/**
 * Force le rechargement du produit côté caisses (le pull est incrémental sur `updated_at`) :
 * la péremption la plus proche affichée à la caisse doit suivre les ventes et réceptions de lots.
 */
export function touchProduct(db: Db, tenantId: string, productId: string) {
  db.prepare('UPDATE products SET updated_at = ? WHERE tenant_id = ? AND id = ?').run(nowIso(), tenantId, productId);
}

/** Péremption la plus proche parmi les lots encore en stock, par produit — pour l'avertissement caisse. */
export function nearestExpiryByProduct(db: Db, tenantId: string, storeId: string | undefined): Map<string, string> {
  const rows = (storeId
    ? db.prepare(`SELECT product_id, expiry_date, SUM(quantity_delta) q FROM stock_movements
        WHERE tenant_id = ? AND store_id = ? AND expiry_date IS NOT NULL GROUP BY product_id, COALESCE(lot_number,''), expiry_date HAVING q > 0.0000001`).all(tenantId, storeId)
    : db.prepare(`SELECT product_id, expiry_date, SUM(quantity_delta) q FROM stock_movements
        WHERE tenant_id = ? AND expiry_date IS NOT NULL GROUP BY product_id, COALESCE(lot_number,''), expiry_date HAVING q > 0.0000001`).all(tenantId)) as any[];
  const map = new Map<string, string>();
  for (const r of rows) {
    const cur = map.get(r.product_id);
    if (!cur || r.expiry_date < cur) map.set(r.product_id, r.expiry_date);
  }
  return map;
}
