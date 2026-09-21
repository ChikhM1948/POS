import type { OfflineDB } from '../db/offline-db';
import type { SyncPushRequest, SyncPushResponse } from '@pos-dz/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const HEALTHCHECK_TIMEOUT_MS = 3000;
const RETRY_INTERVAL_MS = 30_000;
const PUSH_BATCH_SIZE = 50;

/**
 * navigator.onLine n'est pas fiable (faux positifs sur portail captif / Wi-Fi sans Internet) —
 * voir docs/SYNC_STRATEGY.md#détection-de-létat-réseau. On confirme toujours par un health-check.
 */
async function isApiReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export class SyncEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  constructor(
    private db: OfflineDB,
    private tenantId: string,
    private deviceId: string,
    private token: string,
  ) {}

  start() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncNow());
    }
    this.timer = setInterval(() => this.syncNow(), RETRY_INTERVAL_MS);
    this.syncNow();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Idempotent et sûr à appeler en concurrence (ex. event 'online' + interval qui se chevauchent). */
  async syncNow(): Promise<void> {
    if (this.syncing) return;
    if (!(await isApiReachable())) return;

    this.syncing = true;
    try {
      await this.pushPending();
      await this.pullChanges();
    } finally {
      this.syncing = false;
    }
  }

  private async pushPending(): Promise<void> {
    const pending = await this.db.outbox.limit(PUSH_BATCH_SIZE).toArray();
    if (pending.length === 0) return;

    const request: SyncPushRequest = {
      tenantId: this.tenantId,
      deviceId: this.deviceId,
      operations: pending.map((entry) => entry.operation),
    };

    const res = await fetch(`${API_BASE_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify(request),
    });
    if (!res.ok) return; // on retentera au prochain cycle, l'outbox reste intacte

    const { results }: SyncPushResponse = await res.json();
    const appliedIds = new Set(
      results.filter((r) => r.status === 'applied' || r.status === 'already_applied').map((r) => r.clientGeneratedId),
    );

    await this.db.transaction('rw', this.db.outbox, this.db.sales, this.db.stockMovements, async () => {
      for (const entry of pending) {
        if (!appliedIds.has(entry.operation.clientGeneratedId)) continue;
        await this.db.outbox.delete(entry.id!);
        if (entry.operation.entityType === 'sale') {
          await this.db.sales.update(entry.operation.clientGeneratedId, { syncStatus: 'synced' });
        } else if (entry.operation.entityType === 'stockMovement') {
          await this.db.stockMovements.update(entry.operation.clientGeneratedId, { syncStatus: 'synced' });
        }
      }
    });

    // S'il reste des opérations en attente (lot tronqué), on enchaîne immédiatement.
    if (pending.length === PUSH_BATCH_SIZE) await this.pushPending();
  }

  private async pullChanges(): Promise<void> {
    const lastSync = await this.db.meta.get('lastSyncedAt');
    const since = lastSync?.value ?? new Date(0).toISOString();

    const res = await fetch(
      `${API_BASE_URL}/sync/pull?tenantId=${this.tenantId}&since=${encodeURIComponent(since)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!res.ok) return;

    const { products, serverTime } = await res.json();

    await this.db.transaction('rw', this.db.products, this.db.meta, async () => {
      for (const p of products) {
        await this.db.products.put({
          id: p._id,
          sku: p.sku,
          barcode: p.barcode,
          nameFr: p.name.fr,
          nameAr: p.name.ar,
          category: p.category,
          imageUrl: p.imageUrl,
          sellingPriceCents: p.sellingPriceCents,
          taxRate: p.taxRate,
          unit: p.unit,
          updatedAt: p.updatedAt,
        });
      }
      await this.db.meta.put({ key: 'lastSyncedAt', value: serverTime });
    });
  }
}
