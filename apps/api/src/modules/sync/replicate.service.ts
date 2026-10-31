import { ObjectId } from 'mongodb';
import type { Model } from 'mongoose';
import { Tenant } from '../../models/Tenant';
import { Store } from '../../models/Store';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Customer } from '../../models/Customer';
import { Supplier } from '../../models/Supplier';
import { Sale } from '../../models/Sale';
import { StockMovement } from '../../models/StockMovement';
import { CustomerLedgerEntry } from '../../models/CustomerLedgerEntry';
import { SupplierLedgerEntry } from '../../models/SupplierLedgerEntry';

/**
 * Réplication poste installé → cloud. Le poste (SQLite) envoie ses enregistrements avec des
 * identifiants déjà au format ObjectId (hex 24) : on les upserte tels quels, sans table de
 * correspondance. Rejouable à volonté (idempotent).
 *  - référentiels (produits, clients…) : dernier état gagnant, `$set` par _id ;
 *  - journaux append-only (ventes, mouvements de stock, écritures) : `$setOnInsert` par
 *    (tenantId, clientGeneratedId) — jamais modifiés ni dupliqués, même s'ils existent déjà côté cloud.
 */
interface Spec {
  model: Model<any>;
  oids: string[];
  dates: string[];
  appendOnly?: boolean;
}

const TS = ['createdAt', 'updatedAt'];

export const REPLICATION_SPECS: Record<string, Spec> = {
  tenants: { model: Tenant, oids: ['_id'], dates: TS },
  stores: { model: Store, oids: ['_id', 'tenantId'], dates: TS },
  users: { model: User, oids: ['_id', 'tenantId', 'storeId'], dates: TS },
  products: { model: Product, oids: ['_id', 'tenantId'], dates: TS },
  customers: { model: Customer, oids: ['_id', 'tenantId'], dates: TS },
  suppliers: { model: Supplier, oids: ['_id', 'tenantId'], dates: TS },
  customerLedgerEntries: {
    model: CustomerLedgerEntry, appendOnly: true,
    oids: ['_id', 'tenantId', 'customerId', 'reference.id'], dates: ['createdAtLocal', ...TS],
  },
  supplierLedgerEntries: {
    model: SupplierLedgerEntry, appendOnly: true,
    oids: ['_id', 'tenantId', 'supplierId', 'reference.id'], dates: ['createdAtLocal', ...TS],
  },
  sales: {
    model: Sale, appendOnly: true,
    oids: ['_id', 'tenantId', 'storeId', 'cashierId', 'refundOf', 'lines[].productId', 'payments[].customerId'],
    dates: ['createdAtLocal', 'syncedAt', ...TS],
  },
  stockMovements: {
    model: StockMovement, appendOnly: true,
    oids: ['_id', 'tenantId', 'storeId', 'productId', 'supplierId', 'sourceDocument.id'],
    dates: ['createdAtLocal', 'expiryDate', ...TS],
  },
};

function mapPath(obj: any, parts: string[], fn: (v: any) => any): void {
  if (obj == null || typeof obj !== 'object') return;
  const [head, ...rest] = parts;
  const isArray = head.endsWith('[]');
  const key = isArray ? head.slice(0, -2) : head;
  if (rest.length === 0) {
    if (isArray) {
      if (Array.isArray(obj[key])) obj[key] = obj[key].map(fn);
    } else if (obj[key] != null) {
      obj[key] = fn(obj[key]);
    }
    return;
  }
  const child = obj[key];
  if (isArray) {
    if (Array.isArray(child)) child.forEach((c) => mapPath(c, rest, fn));
  } else {
    mapPath(child, rest, fn);
  }
}

function convert(doc: any, spec: Spec): any {
  const out = JSON.parse(JSON.stringify(doc));
  for (const p of spec.oids) mapPath(out, p.split('.'), (v) => new ObjectId(String(v)));
  for (const p of spec.dates) {
    mapPath(out, p.split('.'), (v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error(`date invalide (${p})`);
      return d;
    });
  }
  return out;
}

export interface ReplicateResult {
  [collection: string]: { received: number; rejected: number };
}

/** `tenantId` vient du JWT : il écrase celui des documents reçus (jamais d'écriture inter-commerces). */
export async function replicate(tenantId: string, records: Record<string, any[]>): Promise<ReplicateResult> {
  const tenantOid = new ObjectId(tenantId);
  const result: ReplicateResult = {};

  for (const [name, spec] of Object.entries(REPLICATION_SPECS)) {
    const docs = records[name];
    if (!Array.isArray(docs) || docs.length === 0) continue;

    const ops: any[] = [];
    let rejected = 0;
    for (const raw of docs) {
      try {
        const doc = convert(raw, spec);
        if (name === 'tenants') {
          if (!doc._id.equals(tenantOid)) throw new Error('tenant étranger');
          delete doc.slug; // le slug est attribué à la création, jamais modifié par réplication
        } else {
          doc.tenantId = tenantOid;
        }
        const { _id, createdAt, ...rest } = doc;
        if (spec.appendOnly) {
          ops.push({
            updateOne: {
              filter: { tenantId: tenantOid, clientGeneratedId: doc.clientGeneratedId },
              update: { $setOnInsert: doc },
              upsert: true,
            },
          });
        } else {
          ops.push({
            updateOne: { filter: { _id }, update: { $set: rest, ...(createdAt ? { $setOnInsert: { createdAt } } : {}) }, upsert: true },
          });
        }
      } catch {
        rejected++;
      }
    }

    if (ops.length > 0) {
      try {
        await spec.model.collection.bulkWrite(ops, { ordered: false });
      } catch (err: any) {
        // Conflit d'unicité sur certains documents (ex. même SKU créé séparément dans le cloud) :
        // les autres ont été appliqués (ordered: false) ; on ne compte en rejet que ceux en erreur.
        rejected += err?.writeErrors?.length ?? ops.length;
      }
    }
    result[name] = { received: docs.length, rejected };
  }
  return result;
}

/**
 * Première connexion d'un poste : crée commerce + boutique + compte admin s'ils n'existent pas
 * (jamais de modification d'un commerce existant — il faut alors s'authentifier).
 */
export async function bootstrapTenant(input: { tenant: any; store: any; user: any }): Promise<{ created: boolean }> {
  const tenantDoc = convert(input.tenant, REPLICATION_SPECS.tenants);
  if (await Tenant.collection.findOne({ _id: tenantDoc._id })) return { created: false };

  if (await Tenant.exists({ slug: tenantDoc.slug })) {
    tenantDoc.slug = `${tenantDoc.slug}-${String(tenantDoc._id).slice(-6)}`;
  }
  const storeDoc = convert(input.store, REPLICATION_SPECS.stores);
  const userDoc = convert(input.user, REPLICATION_SPECS.users);
  storeDoc.tenantId = userDoc.tenantId = tenantDoc._id;

  await Tenant.collection.insertOne(tenantDoc);
  await Store.collection.insertOne(storeDoc);
  await User.collection.insertOne(userDoc);
  return { created: true };
}
