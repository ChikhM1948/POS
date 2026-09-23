import Dexie, { Table } from 'dexie';
import type { SaleLine, SalePayment, SaleTotals, StockMovementType, SyncOperation } from '@pos-dz/shared';

export interface LocalProduct {
  id: string; // Mongo _id (string)
  sku: string;
  barcode?: string;
  nameFr: string;
  nameAr?: string;
  category?: string;
  imageUrl?: string;
  sellingPriceCents: number;
  costPriceCents: number;
  minMarginCents?: number;
  taxRate: 19 | 9 | 0;
  unit: string;
  updatedAt: string;
}

export interface LocalCustomer {
  id: string; // Mongo _id (string)
  name: string;
  phone?: string;
}

export interface LocalSale {
  clientGeneratedId: string;
  number: string;
  storeId: string;
  registerId: string;
  cashierId: string;
  lines: SaleLine[];
  payments: SalePayment[];
  totals: SaleTotals;
  createdAtLocal: string;
  syncStatus: 'pending' | 'synced';
}

export interface LocalStockMovement {
  clientGeneratedId: string;
  productId: string;
  variantSku?: string;
  storeId: string;
  type: StockMovementType;
  quantityDelta: number;
  createdAtLocal: string;
  syncStatus: 'pending' | 'synced';
}

export interface OutboxEntry {
  id?: number; // auto-increment
  operation: SyncOperation;
}

export interface SyncMeta {
  key: string; // 'lastSyncedAt' | 'localSaleCounter' | 'tenantBranding'
  value: string;
}

/**
 * Une base Dexie par poste de caisse (nom de base = deviceId), pour que deux caisses
 * sur la même machine/navigateur ne partagent jamais leurs compteurs locaux.
 */
export class OfflineDB extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>;
  stockMovements!: Table<LocalStockMovement, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<SyncMeta, string>;
  customers!: Table<LocalCustomer, string>;

  constructor(deviceId: string) {
    super(`pos-db-${deviceId}`);
    this.version(1).stores({
      products: 'id, sku, barcode',
      sales: 'clientGeneratedId, syncStatus, createdAtLocal',
      stockMovements: 'clientGeneratedId, productId, syncStatus',
      outbox: '++id',
      meta: 'key',
    });
    // v2 : clients synchronisés pour la sélection à la caisse lors d'une vente à crédit ("Karna").
    this.version(2).stores({
      customers: 'id, name',
    });
  }
}

let dbInstance: OfflineDB | null = null;

/** Singleton — un seul handle Dexie par session navigateur/Electron renderer. */
export function getOfflineDB(deviceId: string): OfflineDB {
  if (!dbInstance) {
    dbInstance = new OfflineDB(deviceId);
  }
  return dbInstance;
}

/** Compteur séquentiel local pour la numérotation des tickets — voir docs/ARCHITECTURE.md#4. */
export async function nextLocalSaleNumber(db: OfflineDB, storeCode: string, registerId: string): Promise<string> {
  const key = `saleCounter:${registerId}`;
  const current = await db.meta.get(key);
  const next = (current ? parseInt(current.value, 10) : 0) + 1;
  await db.meta.put({ key, value: String(next) });
  return `${storeCode}-${registerId}-${String(next).padStart(5, '0')}`;
}
