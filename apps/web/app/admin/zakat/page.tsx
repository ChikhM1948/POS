'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_ZAKAT_RATE_PERCENT } from '@pos-dz/shared';
import type { StockBalanceDTO, StoreDTO, TenantSettingsDTO } from '@pos-dz/shared';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { stockValueCents } from '../../../lib/stock';
import { calculateStockZakat } from '../../../lib/zakat';
import { StatTile } from '../../../components/admin/reports/StatTile';

type StockRow = StockBalanceDTO & { storeId: string; storeName: string };

export default function ZakatPage() {
  const { session } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [ratePercent, setRatePercent] = useState(DEFAULT_ZAKAT_RATE_PERCENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const allowed = session?.role === 'store_admin' || session?.role === 'super_admin';

  useEffect(() => {
    if (!session || !allowed) return;
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);
    setRows([]);

    async function load() {
      try {
        const [{ stores: availableStores }, { tenant }] = await Promise.all([
          adminFetch<{ stores: StoreDTO[] }>(session!.token, '/stores', { signal }),
          adminFetch<{ tenant: TenantSettingsDTO }>(session!.token, '/tenant', { signal }),
        ]);
        if (signal.aborted) return;
        setStores(availableStores);
        setRatePercent(tenant.zakatRatePercent ?? DEFAULT_ZAKAT_RATE_PERCENT);
        const selectedStores = storeId ? availableStores.filter((store) => store.id === storeId) : availableStores;
        if (storeId && selectedStores.length === 0) {
          setStoreId('');
          return;
        }
        const stocks = await Promise.all(selectedStores.map(async (store) => {
          const { balances } = await adminFetch<{ balances: StockBalanceDTO[] }>(
            session!.token, `/stock/balances?storeId=${encodeURIComponent(store.id)}`, { signal },
          );
          return balances.filter((balance) => balance.quantity > 0)
            .map((balance) => ({ ...balance, storeId: store.id, storeName: store.name }));
        }));
        if (!signal.aborted) setRows(stocks.flat());
      } catch (err) {
        if (!signal.aborted) setError(err instanceof Error ? err.message : t('common.errorLoading'));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [session, allowed, storeId, refresh, t]);

  if (!allowed) return <p className="text-sm text-neutral-600">{t('zakat.restricted')}</p>;

  const summary = calculateStockZakat(rows, ratePercent);
  const formattedRate = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 6 }).format(ratePercent);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('zakat.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t('zakat.description')}</p>
          <Link href="/admin/settings#zakat-settings" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">{t('zakat.editSettings')}</Link>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-neutral-600">
            {t('zakat.store')}
            <select
              value={storeId}
              onChange={(event) => { setLoading(true); setStoreId(event.target.value); }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand-500"
            >
              <option value="">{t('sales.allStores')}</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name} ({store.code})</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('zakat.refresh')}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading && <p role="status" className="text-sm text-neutral-500">{t('common.loading')}</p>}

      {!loading && !error && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatTile label={t('zakat.stockValue')} value={formatCurrency(summary.stockValueCents, locale)} hint={t('zakat.formula')} />
            <StatTile label={t('zakat.estimate')} value={formatCurrency(summary.zakatCents, locale)} hint={t('zakat.rate', { rate: formattedRate })} />
          </div>
          <p className="max-w-3xl text-sm text-neutral-600">{t('zakat.scope')}</p>

          <section aria-labelledby="zakat-details" className="overflow-x-auto rounded-xl bg-white shadow-card">
            <h2 id="zakat-details" className="px-4 py-3 text-sm font-semibold text-neutral-900">{t('zakat.details')}</h2>
            <table className="w-full text-sm">
              <thead className="border-y border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">{t('products.tableProduct')}</th>
                  <th scope="col" className="px-4 py-3 text-start">{t('zakat.store')}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t('stock.tableCurrent')}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t('stock.tablePrice')}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t('stock.tableValue')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.storeId}:${row.productId}`} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-neutral-900">{locale === 'ar' ? row.name.ar || row.name.fr : row.name.fr}</p>
                      <p className="text-xs text-neutral-500">{row.sku}</p>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{row.storeName}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-end tabular-nums text-neutral-900">{row.quantity} {row.unit}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-end tabular-nums text-neutral-600">{formatCurrency(row.sellingPriceCents, locale)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-end font-medium tabular-nums text-neutral-900">{formatCurrency(stockValueCents(row), locale)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">{t('zakat.empty')}</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
