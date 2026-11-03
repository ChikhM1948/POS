import bcrypt from 'bcryptjs';
import { normalizeIdentifier } from './identifier';
import { createHash } from 'node:crypto';
import type { Db } from './db';
import { HttpError, nowIso } from './util';

/**
 * Réplication du poste (SQLite) vers la base en ligne (API cloud + MongoDB), avec le MÊME compte :
 * le hash du mot de passe local est copié dans le cloud, on s'y connecte avec les mêmes identifiants.
 * Les identifiants locaux (UUID) sont convertis de façon déterministe en ObjectId (`oid`) : le
 * cloud reçoit toujours le même _id pour la même ligne, sans migration ni table de correspondance.
 * Fonctionne hors-ligne : les échecs réseau sont simplement rejoués au cycle suivant.
 */

const SYNC_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;

export function oid(id: string): string {
  return /^[0-9a-f]{24}$/i.test(id) ? id.toLowerCase() : createHash('sha1').update(id).digest('hex').slice(0, 24);
}
const oidOrUndef = (id?: string | null) => (id ? oid(id) : undefined);

interface TableSpec {
  /** Table SQLite source. */
  table: string;
  /** Colonne d'horodatage servant de curseur (référentiel : updated_at ; journal : created_at). */
  ts: 'updated_at' | 'created_at' | 'deleted_at';
  batch: number;
  /** Ligne → [collection cloud, document]. */
  map: (r: any) => [string, any];
}

const json = (v: string) => JSON.parse(v);

const TABLES: TableSpec[] = [
  {
    table: 'tenants', ts: 'updated_at', batch: 5,
    map: (r) => ['tenants', {
      _id: oid(r.id), name: r.name, slug: r.slug, branding: json(r.branding), legal: json(r.legal),
      plan: r.plan, status: r.status, syncEnabled: true, createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'stores', ts: 'updated_at', batch: 100,
    map: (r) => ['stores', {
      _id: oid(r.id), name: r.name, code: r.code, address: r.address ?? undefined, isMainStore: !!r.is_main_store,
      active: !!r.active, createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'users', ts: 'updated_at', batch: 100,
    map: (r) => ['users', {
      _id: oid(r.id), storeId: oidOrUndef(r.store_id), name: r.name, email: r.email, passwordHash: r.password_hash,
      pinCodeHash: r.pin_code_hash ?? undefined, role: r.role, permissions: json(r.permissions), active: !!r.active,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'products', ts: 'updated_at', batch: 20, // les photos produit (data URL) alourdissent les lots
    map: (r) => ['products', {
      _id: oid(r.id), sku: r.sku, barcode: r.barcode ?? undefined, name: { fr: r.name_fr, ar: r.name_ar ?? undefined },
      category: r.category ?? undefined, imageUrl: r.image_url ?? undefined, unit: r.unit, variants: json(r.variants),
      sellingPriceCents: r.selling_price_cents, costPriceCents: r.cost_price_cents, minSellingPriceCents: r.min_selling_price_cents ?? undefined,
      promoPriceCents: r.promo_price_cents ?? undefined, promoStart: r.promo_start ?? undefined,
      promoEnd: r.promo_end ?? undefined, soldByWeight: !!r.sold_by_weight,
      taxRate: r.tax_rate, isPerishable: !!r.is_perishable, lowStockThreshold: r.low_stock_threshold ?? undefined, active: !!r.active,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'customers', ts: 'updated_at', batch: 200,
    map: (r) => ['customers', {
      _id: oid(r.id), name: r.name, phone: r.phone ?? undefined, active: !!r.active, creditLimitCents: r.credit_limit_cents ?? undefined,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'suppliers', ts: 'updated_at', batch: 200,
    map: (r) => ['suppliers', {
      _id: oid(r.id), name: r.name, phone: r.phone ?? undefined, address: r.address ?? undefined, active: !!r.active,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }],
  },
  {
    table: 'ledger_entries', ts: 'created_at', batch: 200,
    map: (r) => {
      const customer = r.party_kind === 'customer';
      return [customer ? 'customerLedgerEntries' : 'supplierLedgerEntries', {
        _id: oid(r.id), [customer ? 'customerId' : 'supplierId']: oid(r.party_id), type: r.type, amountCents: r.amount_cents,
        note: r.note ?? undefined, reference: r.ref_type && r.ref_id ? { type: r.ref_type, id: oid(r.ref_id) } : undefined,
        clientGeneratedId: r.client_generated_id, createdAtLocal: r.created_at_local, createdAt: r.created_at, updatedAt: r.created_at,
      }];
    },
  },
  {
    table: 'sales', ts: 'created_at', batch: 100,
    map: (r) => ['sales', {
      _id: oid(r.id), storeId: oid(r.store_id), registerId: r.register_id, cashierId: oid(r.cashier_id), number: r.number, type: r.type,
      refundOf: oidOrUndef(r.refund_of),
      lines: json(r.lines).map((l: any) => ({ ...l, productId: oid(l.productId) })),
      payments: json(r.payments).map((p: any) => ({ ...p, customerId: oidOrUndef(p.customerId) })),
      totals: json(r.totals), status: r.status, clientGeneratedId: r.client_generated_id, createdAtLocal: r.created_at_local,
      syncedAt: r.synced_at ?? r.created_at, createdAt: r.created_at, updatedAt: r.created_at,
    }],
  },
  {
    table: 'stock_movements', ts: 'created_at', batch: 200,
    map: (r) => ['stockMovements', {
      _id: oid(r.id), storeId: oid(r.store_id), productId: oid(r.product_id), variantSku: r.variant_sku ?? undefined, type: r.type,
      quantityDelta: r.quantity_delta, unitCostCents: r.unit_cost_cents ?? undefined, supplierId: oidOrUndef(r.supplier_id),
      lotNumber: r.lot_number ?? undefined, expiryDate: r.expiry_date ?? undefined, note: r.note ?? undefined,
      sourceDocument: r.source_type && r.source_id ? { type: r.source_type, id: oid(r.source_id) } : undefined,
      clientGeneratedId: r.client_generated_id, createdAtLocal: r.created_at_local, createdAt: r.created_at, updatedAt: r.created_at,
    }],
  },
  {
    // Suppressions définitives (produits) : rejouées côté cloud après les référentiels — voir replicate.service.ts.
    table: 'deleted_records', ts: 'deleted_at', batch: 100,
    map: (r) => ['deletedProducts', { _id: oid(r.id), refId: oid(r.ref_id), deletedAt: r.deleted_at }],
  },
];

interface Cursor { ts: string; id: string }

export interface CloudStatus {
  configured: boolean;
  url?: string;
  email?: string;
  running: boolean;
  /** Lignes locales pas encore envoyées au cloud. */
  pending: number;
  lastSyncAt?: string;
  lastError?: string;
}

export class CloudSync {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private db: Db, private trialInfo: () => { deviceId: string; startedAt: string } | undefined = () => undefined) {}

  /** Licence signée du poste, envoyée avec le bootstrap pour la rattacher au commerce cloud. */
  licenseKey(): string | undefined {
    try { return JSON.parse(this.getMeta('license') ?? '{}').key; } catch { return undefined; }
  }

  private getMeta(key: string): string | undefined {
    return (this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined)?.value;
  }
  private setMeta(key: string, value: string | undefined) {
    if (value === undefined) this.db.prepare('DELETE FROM app_meta WHERE key = ?').run(key);
    else this.db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }
  private cursor(table: string): Cursor {
    const raw = this.getMeta(`cloud_cursor_${table}`);
    return raw ? JSON.parse(raw) : { ts: '', id: '' };
  }
  private pendingSql(spec: TableSpec) {
    const c = this.cursor(spec.table);
    const scope = spec.table === 'tenants' ? 'id IS NOT NULL' : '1=1';
    return { c, where: `${scope} AND (${spec.ts} > @ts OR (${spec.ts} = @ts AND id > @id))` };
  }

  status(): CloudStatus {
    const url = this.getMeta('cloud_url');
    let pending = 0;
    if (url) {
      for (const spec of TABLES) {
        const { c, where } = this.pendingSql(spec);
        pending += (this.db.prepare(`SELECT COUNT(*) n FROM ${spec.table} WHERE ${where}`).get({ ts: c.ts, id: c.id }) as { n: number }).n;
      }
    }
    return {
      configured: Boolean(url),
      url,
      email: this.getMeta('cloud_email'),
      running: this.running,
      pending,
      lastSyncAt: this.getMeta('cloud_last_sync'),
      lastError: this.getMeta('cloud_last_error'),
    };
  }

  private async http(path: string, body: unknown, token?: string): Promise<{ status: number; data: any }> {
    const res = await fetch(`${this.getMeta('cloud_url')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }

  private async login(): Promise<string> {
    const tenant = this.db.prepare('SELECT id FROM tenants LIMIT 1').get() as { id: string };
    const { status, data } = await this.http('/auth/login', {
      tenantId: oid(tenant.id), email: this.getMeta('cloud_email'), password: this.getMeta('cloud_password'),
    });
    if (status !== 200 || !data.token) throw new Error(data.error ?? `Connexion cloud refusée (${status}).`);
    this.setMeta('cloud_token', data.token);
    return data.token;
  }

  /** Relie ce poste au cloud avec le compte administrateur local (mêmes identifiants des deux côtés). */
  async connect(input: { url?: string; email?: string; password?: string }): Promise<CloudStatus> {
    const url = String(input.url ?? '').trim().replace(/\/+$/, '');
    const email = normalizeIdentifier(input.email ?? '');
    const password = String(input.password ?? '');
    if (!/^https?:\/\//.test(url) || !email || !password) throw new HttpError(400, 'Adresse du serveur, email (ou téléphone) et mot de passe sont requis.');

    const user: any = this.db.prepare("SELECT * FROM users WHERE email = ? AND active = 1 AND role IN ('store_admin','super_admin')").get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new HttpError(401, 'Identifiants administrateur invalides.');

    this.setMeta('cloud_url', url);
    this.setMeta('cloud_email', email);
    this.setMeta('cloud_password', password);
    try {
      const [, tenant] = TABLES[0].map(this.db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id));
      const [, store] = TABLES[1].map(this.db.prepare('SELECT * FROM stores WHERE tenant_id = ? AND is_main_store = 1').get(user.tenant_id) ?? this.db.prepare('SELECT * FROM stores WHERE tenant_id = ? LIMIT 1').get(user.tenant_id));
      const [, cloudUser] = TABLES[2].map(user);
      const boot = await this.http('/auth/replicate-bootstrap', { tenant, store: { ...store, tenantId: tenant._id }, user: { ...cloudUser, tenantId: tenant._id }, license: { key: this.licenseKey() }, trial: this.licenseKey() ? undefined : this.trialInfo() });
      if (boot.status !== 200) throw new Error(boot.data.error ?? `Serveur injoignable ou incompatible (${boot.status}).`);
      await this.login();
    } catch (err) {
      for (const k of ['cloud_url', 'cloud_email', 'cloud_password', 'cloud_token']) this.setMeta(k, undefined);
      if (err instanceof HttpError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(502, /fetch failed|timeout|aborted/i.test(msg) ? "Impossible de joindre le serveur en ligne. Vérifiez l'adresse et la connexion Internet." : msg);
    }
    for (const spec of TABLES) this.setMeta(`cloud_cursor_${spec.table}`, undefined);
    this.setMeta('cloud_last_error', undefined);
    void this.syncNow();
    return this.status();
  }

  disconnect() {
    for (const spec of TABLES) this.setMeta(`cloud_cursor_${spec.table}`, undefined);
    for (const k of ['cloud_url', 'cloud_email', 'cloud_password', 'cloud_token', 'cloud_last_sync', 'cloud_last_error']) this.setMeta(k, undefined);
  }

  private async replicate(records: Record<string, any[]>): Promise<void> {
    let token = this.getMeta('cloud_token') ?? (await this.login());
    let res = await this.http('/sync/replicate', { records }, token);
    if (res.status === 401) { // le token cloud expire : on se reconnecte avec le compte enregistré
      token = await this.login();
      res = await this.http('/sync/replicate', { records }, token);
    }
    if (res.status !== 200) throw new Error(res.data.error ?? `Réplication refusée (${res.status}).`);
  }

  /** Envoie tout ce qui est en attente. Sans effet hors-ligne ; jamais deux cycles en parallèle. */
  async syncNow(): Promise<CloudStatus> {
    if (this.running || !this.getMeta('cloud_url')) return this.status();
    this.running = true;
    try {
      for (const spec of TABLES) {
        for (;;) {
          const { c, where } = this.pendingSql(spec);
          const rows = this.db.prepare(`SELECT * FROM ${spec.table} WHERE ${where} ORDER BY ${spec.ts}, id LIMIT ${spec.batch}`).all({ ts: c.ts, id: c.id }) as any[];
          if (rows.length === 0) break;
          const records: Record<string, any[]> = {};
          for (const row of rows) {
            const [collection, doc] = spec.map(row);
            (records[collection] ??= []).push(doc);
          }
          await this.replicate(records);
          const last = rows[rows.length - 1];
          this.setMeta(`cloud_cursor_${spec.table}`, JSON.stringify({ ts: last[spec.ts], id: last.id }));
          if (rows.length < spec.batch) break;
        }
      }
      this.setMeta('cloud_last_sync', nowIso());
      this.setMeta('cloud_last_error', undefined);
    } catch (err) {
      this.setMeta('cloud_last_error', err instanceof Error ? err.message : String(err));
    } finally {
      this.running = false;
    }
    return this.status();
  }

  start() {
    this.timer = setInterval(() => void this.syncNow(), SYNC_INTERVAL_MS);
    setTimeout(() => void this.syncNow(), 5_000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
