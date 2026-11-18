'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { StockMovementPanel } from '../../../components/admin/StockMovementPanel';
import { BatchesPanel } from '../../../components/admin/BatchesPanel';
import { ReorderPanel } from '../../../components/admin/ReorderPanel';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { filterStockBalances, stockValueCents } from '../../../lib/stock';
import type { StockBalanceDTO, StoreDTO } from '@pos-dz/shared';

export default function StockPage() {
  const { t, locale } = useTranslation();
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [balances, setBalances] = useState<StockBalanceDTO[]>([]);
  const [selected, setSelected] = useState<StockBalanceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'batches' | 'reorder'>('stock');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const balanceRequest = useRef(0);
  const filteredBalances = filterStockBalances(balances, search, lowOnly);
  const totalValueCents = filteredBalances.reduce((total, balance) => total + stockValueCents(balance), 0);

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
    const request = ++balanceRequest.current;
    setLoading(true);
    try {
      const { balances } = await adminFetch<{ balances: StockBalanceDTO[] }>(session.token, `/stock/balances?storeId=${storeId}`);
      if (request !== balanceRequest.current) return;
      setBalances(balances);
      setSelected((current) => current ? balances.find((balance) => balance.productId === current.productId) ?? null : null);
      setError(null);
    } catch (err) {
      if (request !== balanceRequest.current) return;
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      if (request === balanceRequest.current) setLoading(false);
    }
  }, [session, storeId]);

  useEffect(() => {
    loadBalances();
    return () => { balanceRequest.current += 1; };
  }, [loadBalances]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('stock.title')}</h1>
        <select
          value={storeId}
          onChange={(e) => {
            balanceRequest.current += 1;
            setStoreId(e.target.value);
            setBalances([]);
            setLoading(true);
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

      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200">
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

      {tab === 'stock' && (
        <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-card sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 sm:w-80">
            {t('stock.searchLabel')}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('stock.searchPlaceholder')}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
            />
          </label>
          <div role="status" className="sm:text-end">
            <p className="text-sm text-neutral-600">{t('stock.totalValue')}</p>
            <p className="text-xl font-semibold text-neutral-900">
              {loading ? t('common.loading') : error ? '—' : formatCurrency(totalValueCents, locale)}
            </p>
            <p className="text-xs text-neutral-500">{t('stock.totalValueHint')}</p>
          </div>
        </div>
      )}

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
              <th className="px-4 py-3">{t('stock.tablePrice')}</th>
              <th className="px-4 py-3">{t('stock.tableValue')}</th>
              <th className="px-4 py-3">{t('stock.tableThreshold')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && filteredBalances.map((b) => {
              const isOut = b.quantity <= 0;
              const isLow = !isOut && b.lowStockThreshold !== undefined && b.lowStockThreshold > 0 && b.quantity <= b.lowStockThreshold;
              return (
                <tr key={b.productId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-neutral-900">{locale === 'ar' ? b.name.ar || b.name.fr : b.name.fr}</p>
                    <p className="font-mono text-xs text-neutral-500">{b.sku}</p>
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${isOut || isLow ? 'text-red-600' : 'text-neutral-900'}`}>
                    {b.quantity} {b.unit}
                    {isOut && <span className="ms-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('stock.outOfStock')}</span>}
                    {isLow && <span className="ms-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('stock.lowStock')}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600">{formatCurrency(b.sellingPriceCents, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-neutral-900">{formatCurrency(stockValueCents(b), locale)}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{b.lowStockThreshold ?? '—'}</td>
                  <td className="px-4 py-2.5 text-end">
                    <button onClick={() => setSelected(b)} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
                      {t('stock.movementHistory')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-500">{t('common.loading')}</td></tr>
            )}
            {!loading && !error && filteredBalances.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  {balances.length === 0 ? t('products.empty') : t('stock.noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
