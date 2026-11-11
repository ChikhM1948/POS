'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { StockMovementPanel } from '../../../components/admin/StockMovementPanel';
import { BatchesPanel } from '../../../components/admin/BatchesPanel';
import { ReorderPanel } from '../../../components/admin/ReorderPanel';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import type { StockBalanceDTO, StoreDTO } from '@pos-dz/shared';

export default function StockPage() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [balances, setBalances] = useState<StockBalanceDTO[]>([]);
  const [selected, setSelected] = useState<StockBalanceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'batches' | 'reorder'>('stock');
  const [lowOnly, setLowOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores')
      .then(({ stores }) => {
        setStores(stores);
        setStoreId((current) => current || stores[0]?.id || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.errorGeneric')));
  }, [session]);

  const loadBalances = useCallback(async () => {
    if (!session || !storeId) return;
    setLoading(true);
    try {
      const { balances } = await adminFetch<{ balances: StockBalanceDTO[] }>(session.token, `/stock/balances?storeId=${storeId}`);
      setBalances(balances);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [session, storeId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('stock.title')}</h1>
        <select
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value);
            setSelected(null);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-1 border-b border-neutral-200">
        {([['stock', 'inventory.tabStock'], ['batches', 'inventory.tabBatches'], ['reorder', 'inventory.tabReorder']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'border-brand-600 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t(label)}
          </button>
        ))}
        {tab === 'stock' && (
          <label className="ms-auto flex items-center gap-2 pb-1 text-sm text-neutral-600">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
            {t('inventory.lowOnly')}
          </label>
        )}
      </div>

      {tab === 'batches' && <BatchesPanel storeId={storeId} />}
      {tab === 'reorder' && <ReorderPanel storeId={storeId} />}

      {tab === 'stock' && selected && (
        <StockMovementPanel
          storeId={storeId}
          product={selected}
          onClose={() => setSelected(null)}
          onMovementCreated={loadBalances}
        />
      )}

      {tab === 'stock' && <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-3">{t('products.tableProduct')}</th>
              <th className="px-4 py-3">{t('stock.tableCurrent')}</th>
              <th className="px-4 py-3">{t('stock.tableThreshold')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {balances.filter((b) => !lowOnly || (b.lowStockThreshold !== undefined && b.lowStockThreshold > 0 && b.quantity <= b.lowStockThreshold)).map((b) => {
              const isOut = b.quantity <= 0;
              const isLow = !isOut && b.lowStockThreshold !== undefined && b.lowStockThreshold > 0 && b.quantity <= b.lowStockThreshold;
              return (
                <tr key={b.productId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-neutral-900">{b.name.fr}</p>
                    <p className="font-mono text-xs text-neutral-500">{b.sku}</p>
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${isOut || isLow ? 'text-red-600' : 'text-neutral-900'}`}>
                    {b.quantity} {b.unit}
                    {isOut && <span className="ms-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('stock.outOfStock')}</span>}
                    {isLow && <span className="ms-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('stock.lowStock')}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{b.lowStockThreshold ?? '—'}</td>
                  <td className="px-4 py-2.5 text-end">
                    <button onClick={() => setSelected(b)} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
                      {t('stock.movementHistory')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && balances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  {t('products.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
