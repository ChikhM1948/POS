'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { DateRangeFilter, type DateRangeValue } from '../../../components/admin/DateRangeFilter';
import { resolvePreset } from '../../../lib/dateRangePresets';
import { StatTile } from '../../../components/admin/reports/StatTile';
import { RevenueBarChart } from '../../../components/admin/reports/RevenueBarChart';
import { PaymentBreakdown } from '../../../components/admin/reports/PaymentBreakdown';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import type { SalesSummaryDTO, StoreDTO, TopProductDTO, ProfitSummaryDTO, DebtsSummaryDTO, DebtorDTO } from '@pos-dz/shared';

export default function ReportsPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState<DateRangeValue>(resolvePreset('7d'));
  const [summary, setSummary] = useState<SalesSummaryDTO | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductDTO[]>([]);
  const [profit, setProfit] = useState<ProfitSummaryDTO | null>(null);
  const [debts, setDebts] = useState<DebtsSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores')
      .then(({ stores }) => setStores(stores))
      .catch(() => undefined);
  }, [session]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: range.from, to: `${range.to}T23:59:59` });
      if (storeId) params.set('storeId', storeId);
      const [{ summary }, { products }, { profit }, { debts }] = await Promise.all([
        adminFetch<{ summary: SalesSummaryDTO }>(session.token, `/reports/summary?${params.toString()}`),
        adminFetch<{ products: TopProductDTO[] }>(session.token, `/reports/top-products?${params.toString()}&limit=8`),
        adminFetch<{ profit: ProfitSummaryDTO }>(session.token, `/reports/profit?${params.toString()}`),
        adminFetch<{ debts: DebtsSummaryDTO }>(session.token, '/reports/debts'),
      ]);
      setSummary(summary);
      setTopProducts(products);
      setProfit(profit);
      setDebts(debts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [session, storeId, range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">{t('reports.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            <option value="">{t('sales.allStores')}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <>
          {/* lg plutôt que sm : la colonne de contenu perd ~224px au profit de la barre latérale,
              donc les seuils Tailwind (basés sur la largeur totale du viewport) doivent être
              décalés pour laisser assez de place à 4 tuiles avant de passer sur cette grille. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t('reports.netRevenue')}
              value={formatDZD(summary.netRevenueCents)}
              hint={`${summary.salesCount} ${summary.salesCount > 1 ? t('reports.salesCountPlural') : t('reports.salesCountSingular')}`}
            />
            <StatTile label={t('reports.avgBasket')} value={formatDZD(summary.averageBasketCents)} />
            <StatTile label={t('reports.taxCollected')} value={formatDZD(summary.taxCollectedCents)} />
            <StatTile
              label={t('reports.refunds')}
              value={formatDZD(summary.refundsCents)}
              hint={`${summary.refundsCount} ${summary.refundsCount > 1 ? t('reports.refundsCountPlural') : t('reports.refundsCountSingular')}`}
            />
            {profit && <StatTile label={t('reports.netProfit')} value={formatDZD(profit.grossProfitCents)} hint={t('reports.marginHint', { percent: profit.marginPercent })} />}
            {debts && <StatTile label={t('reports.supplierDebts')} value={formatDZD(debts.totalSupplierDebtCents)} />}
            {debts && <StatTile label={t('reports.customerDebts')} value={formatDZD(debts.totalCustomerDebtCents)} />}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-neutral-700">{t('reports.revenueByDay')}</h2>
              <RevenueBarChart data={summary.revenueByDay} />
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
              <h2 className="mb-4 text-sm font-semibold text-neutral-700">{t('reports.byPaymentMethod')}</h2>
              <PaymentBreakdown data={summary.revenueByPaymentMethod} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">{t('reports.topProducts')}</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="py-1.5">{t('products.tableProduct')}</th>
                  <th className="py-1.5">{t('reports.tableQuantitySold')}</th>
                  <th className="py-1.5 text-end">{t('reports.tableRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1.5 text-neutral-900">
                      <span className="me-2 inline-block w-4 text-end text-xs text-neutral-400">{i + 1}</span>
                      {p.name.fr}
                    </td>
                    <td className="py-1.5 text-neutral-600">{p.quantity}</td>
                    <td className="py-1.5 text-end font-medium text-neutral-900">{formatDZD(p.revenueCents)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-neutral-500">
                      {t('sales.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {debts && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-neutral-700">{t('reports.topSuppliers')}</h2>
                <DebtorTable rows={debts.topSuppliers} formatDZD={formatDZD} t={t} />
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-neutral-700">{t('reports.topCustomers')}</h2>
                <DebtorTable rows={debts.topCustomers} formatDZD={formatDZD} t={t} />
              </div>
            </div>
          )}
        </>
      )}

      {!summary && !loading && <p className="text-sm text-neutral-500">{t('reports.noData')}</p>}
    </div>
  );
}

function DebtorTable({ rows, formatDZD, t }: { rows: DebtorDTO[]; formatDZD: (cents: number) => string; t: ReturnType<typeof useTranslation>['t'] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-neutral-200 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <tr>
          <th className="py-1.5">{t('reports.debtTableName')}</th>
          <th className="py-1.5 text-end">{t('reports.debtTableBalance')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-100 last:border-0">
            <td className="py-1.5 text-neutral-900">{r.name}</td>
            <td className="py-1.5 text-end font-medium text-red-600">{formatDZD(r.balanceCents)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={2} className="py-4 text-center text-neutral-500">
              {t('reports.noDebts')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
