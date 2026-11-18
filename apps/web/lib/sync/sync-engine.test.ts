import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OfflineDB } from '../db/offline-db';
import { purchasePriceCacheScope } from '../session';
import { SyncEngine } from './sync-engine';

function memoryDB() {
  const products = new Map<string, any>();
  const meta = new Map<string, { key: string; value: string }>([
    ['syncedTenantId', { key: 'syncedTenantId', value: 'tenant' }],
    ['lastSyncedAt', { key: 'lastSyncedAt', value: '2026-01-01T00:00:00.000Z' }],
  ]);
  const db = {
    products: {
      clear: async () => products.clear(),
      put: async (product: any) => products.set(product.id, product),
      delete: async (id: string) => products.delete(id),
    },
    customers: { clear: async () => {}, put: async () => {} },
    meta: {
      get: async (key: string) => meta.get(key),
      put: async (entry: { key: string; value: string }) => meta.set(entry.key, entry),
      delete: async (key: string) => meta.delete(key),
    },
    outbox: { limit: () => ({ toArray: async () => [] }) },
    transaction: async (...args: any[]) => args[args.length - 1](),
  } as unknown as OfflineDB;
  return { db, products, meta };
}

test('recharge les prix après changement de caissier ou de permission puis reprend le pull incrémental', async (t) => {
  t.mock.getter(globalThis, 'navigator', () => ({ onLine: true }));
  const { db, products, meta } = memoryDB();
  const requests: URL[] = [];
  const serverTime = '2026-02-01T00:00:00.000Z';
  t.mock.method(globalThis, 'fetch', async (input: string, options?: RequestInit) => {
    const url = new URL(input);
    if (url.pathname === '/health') return new Response('{}');
    requests.push(url);
    const allowed = (options?.headers as Record<string, string>).Authorization === 'Bearer allowed';
    return Response.json({
      products: url.searchParams.get('since') === new Date(0).toISOString()
        ? [{ _id: 'product', name: { fr: 'Café' }, sellingPriceCents: 20000, costPriceCents: allowed ? 12500 : 0 }]
        : [],
      customers: [], deletedProductIds: [], serverTime,
    });
  });

  for (const [cashierId, allowed] of [['one', false], ['one', true], ['two', false], ['one', true]] as const) {
    const scope = purchasePriceCacheScope({ tenantId: 'tenant', cashierId, canViewPurchasePrice: allowed });
    const engine = new SyncEngine(db, 'tenant', 'device', allowed ? 'allowed' : 'denied', scope);
    await engine.syncNow();
    assert.equal(requests.at(-1)?.searchParams.get('since'), new Date(0).toISOString());
    assert.equal(products.get('product').costPriceCents, allowed ? 12500 : 0);
    assert.equal(meta.get('purchasePriceScope')?.value, scope);
    await engine.syncNow();
    assert.equal(requests.at(-1)?.searchParams.get('since'), serverTime);
    engine.stop();
  }
});

test('une réponse de la session déconnectée ne remplace pas les prix en cache', { timeout: 3000 }, async (t) => {
  t.mock.getter(globalThis, 'navigator', () => ({ onLine: true }));
  const { db, products, meta } = memoryDB();
  let finishPull!: (response: Response) => void;
  let notifyPull!: () => void;
  const pullStarted = new Promise<void>((resolve) => { notifyPull = resolve; });
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    if (new URL(input).pathname === '/health') return new Response('{}');
    notifyPull();
    return new Promise<Response>((resolve) => { finishPull = resolve; });
  });
  const engine = new SyncEngine(db, 'tenant', 'device', 'old-token', 'old-scope');
  const pending = engine.syncNow();
  await pullStarted;
  engine.stop();
  finishPull(Response.json({ products: [{ _id: 'old', name: { fr: 'Old' }, costPriceCents: 0 }], serverTime: 'now' }));
  await pending;
  assert.equal(products.size, 0);
  assert.equal(meta.get('purchasePriceScope'), undefined);
});
