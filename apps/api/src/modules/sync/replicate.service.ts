import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { Model } from 'mongoose';
import { Tenant } from '../../models/Tenant';
import { License } from '../../models/License';
import { Store } from '../../models/Store';
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Customer } from '../../models/Customer';
import { Supplier } from '../../models/Supplier';
import { Sale } from '../../models/Sale';
import { StockMovement } from '../../models/StockMovement';
import { CustomerLedgerEntry } from '../../models/CustomerLedgerEntry';
import { SupplierLedgerEntry } from '../../models/SupplierLedgerEntry';
import { deleteProductPermanently } from '../products/products.service';
import { TRIAL_DAYS } from '@pos-dz/shared';

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
  products: { model: Product, oids: ['_id', 'tenantId'], dates: [...TS, 'promoStart', 'promoEnd'] },
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

  // Suppressions définitives faites sur le poste : même garde-fous que côté poste (historique cloud compris),
  // et la pierre tombale créée sert ensuite aux autres caisses reliées au cloud.
  const deleted = records.deletedProducts;
  if (Array.isArray(deleted) && deleted.length > 0) {
    let rejected = 0;
    for (const d of deleted) {
      try {
        await deleteProductPermanently(tenantId, String(d.refId));
      } catch {
        rejected++;
      }
    }
    result.deletedProducts = { received: deleted.length, rejected };
  }
  return result;
}

/**
 * Première connexion d'un poste : crée commerce + boutique + compte admin s'ils n'existent pas
 * (jamais de modification d'un commerce existant — il faut alors s'authentifier).
 */
export async function bootstrapTenant(input: { tenant: any; store: any; user: any; licenseKey?: string; trial?: { deviceId?: string; startedAt?: string }; ip?: string }): Promise<{ created: boolean }> {
  // Route non authentifiée : on valide la forme avant tout (le corps vient d'un client non fiable).
  const hash = String(input.user?.passwordHash ?? '');
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) {
    throw Object.assign(new Error('Compte invalide.'), { status: 400 });
  }
  let tenantDoc: any;
  try { tenantDoc = convert(input.tenant, REPLICATION_SPECS.tenants); } catch { throw Object.assign(new Error('Commerce invalide.'), { status: 400 }); }
  if (typeof tenantDoc.slug !== 'string' || !tenantDoc.slug) throw Object.assign(new Error('Commerce invalide.'), { status: 400 });
  if (await Tenant.collection.findOne({ _id: tenantDoc._id })) return { created: false };

  if (await Tenant.exists({ slug: tenantDoc.slug })) {
    tenantDoc.slug = `${tenantDoc.slug}-${String(tenantDoc._id).slice(-6)}`;
  }
  const storeDoc = convert(input.store, REPLICATION_SPECS.stores);
  const userDoc = convert(input.user, REPLICATION_SPECS.users);
  storeDoc.tenantId = userDoc.tenantId = tenantDoc._id;
  // Jamais de privilèges ni de plan choisis par le client : le poste crée UN compte admin de son propre commerce.
  userDoc.role = 'store_admin';
  userDoc.active = true;
  userDoc.permissions = [];
  userDoc.tokenVersion = 0;
  delete userDoc.pinCodeHash;
  tenantDoc.plan = 'starter';
  delete tenantDoc.license;

  // Deux cas : (1) le poste a déjà échangé une clé (POST /license/redeem) -> on la rattache au commerce ;
  // (2) essai sans clé : le poste a créé son compte hors-ligne et démarré un essai local -> on le reprend ici.
  // Route non authentifiée : sans clé redeemée et libre ni essai valide, on refuse.
  let lic;
  if (input.licenseKey) {
    // Rattachement atomique : une clé ne peut être reliée qu'à UN commerce, même sous requêtes concurrentes.
    lic = await License.findOneAndUpdate(
      { key: String(input.licenseKey).toUpperCase(), redeemedAt: { $exists: true }, revoked: false, tenantId: { $exists: false } },
      { $set: { tenantId: tenantDoc._id } },
      { new: true },
    );
    if (!lic) {
      throw Object.assign(new Error("Clé d'activation invalide ou déjà rattachée à un commerce."), { status: 403 });
    }
  } else {
    lic = await adoptDeviceTrial(input.trial, tenantDoc._id, input.ip);
  }
  tenantDoc.license = { key: lic.key, kind: lic.kind, activatedAt: lic.redeemedAt, expiresAt: lic.expiresAt };
  tenantDoc.status = lic.kind === 'trial' ? 'trial' : 'active';
  try {
    await Tenant.collection.insertOne(tenantDoc);
  } catch (err: any) {
    if (err?.code === 11000) return { created: false }; // course : un autre appel l'a créé entre-temps
    throw err;
  }
  await Store.collection.insertOne(storeDoc);
  await User.collection.insertOne(userDoc);
  return { created: true };
}

/**
 * Essai gratuit d'un poste desktop, sans clé. Un poste (deviceId) n'a droit qu'à UN essai : l'enregistrement
 * est une vraie License (kind 'trial', liée à `device:<id>`), donc il apparaît dans la liste du super admin
 * et peut être révoqué. La date de départ est celle du poste (jamais dans le futur) : se connecter au cloud
 * ne rallonge pas l'essai.
 */
const MAX_TRIALS_PER_IP_PER_DAY = 3;

async function adoptDeviceTrial(trial: { deviceId?: string; startedAt?: string } | undefined, tenantId: unknown, ip?: string) {
  const deviceId = String(trial?.deviceId ?? '').trim();
  if (!/^[0-9a-f-]{16,64}$/i.test(deviceId)) {
    throw Object.assign(new Error("Clé d'activation ou essai valide requis pour relier ce poste au cloud."), { status: 403 });
  }
  const boundTo = `device:${deviceId}`;
  if (await License.exists({ boundTo, kind: 'trial', tenantId: { $exists: true } })) {
    throw Object.assign(new Error("L'essai gratuit de ce poste est déjà rattaché à un commerce."), { status: 403 });
  }
  // Le deviceId est déclaré par le client (essai hors-ligne, non signable) : on plafonne donc aussi par IP source,
  // sinon un script forgerait autant d'identifiants de poste que voulu pour obtenir autant d'essais.
  const originIp = ip ? createHash('sha256').update(ip).digest('hex') : undefined;
  if (originIp) {
    const recent = await License.countDocuments({ originIp, kind: 'trial', createdAt: { $gt: new Date(Date.now() - 86_400_000) } });
    if (recent >= MAX_TRIALS_PER_IP_PER_DAY) {
      throw Object.assign(new Error("Trop d'essais gratuits demandés depuis cette adresse. Utilisez une clé d'activation."), { status: 429 });
    }
  }
  const parsed = trial?.startedAt ? new Date(trial.startedAt) : new Date();
  const now = new Date();
  const startedAt = Number.isNaN(parsed.getTime()) || parsed > now ? now : parsed;
  return License.create({
    key: `TRIAL-${deviceId.replace(/-/g, '').slice(0, 12).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    kind: 'trial',
    durationDays: TRIAL_DAYS,
    note: 'Essai desktop sans clé',
    redeemedAt: startedAt,
    expiresAt: new Date(startedAt.getTime() + TRIAL_DAYS * 86_400_000),
    boundTo,
    tenantId,
    originIp,
  });
}
