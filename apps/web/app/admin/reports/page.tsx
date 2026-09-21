'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { DateRangeFilter, type DateRangeValue } from '../../../components/admin/DateRangeFilter';
import { resolvePreset } from '../../../lib/dateRangePresets';
import { StatTile } from '../../../components/admin/reports/StatTile';
import { RevenueBarChart } from '../../../components/admin/reports/RevenueBarChart';
import { PaymentBreakdown } from '../../../components/admin/reports/PaymentBreakdown';
import type { SalesSummaryDTO, StoreDTO, TopProductDTO } from '@pos-dz/shared';

const formatDZD = (cents: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

export default function ReportsPage() {
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState<DateRangeValue>(resolvePreset('7d'));
  const [summary, setSummary] = useState<SalesSummaryDTO | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductDTO[]>([]);
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
      const [{ summary }, { products }] = await Promise.all([
        adminFetch<{ summary: SalesSummaryDTO }>(session.token, `/reports/summary?${params.toString()}`),
        adminFetch<{ products: TopProductDTO[] }>(session.token, `/reports/top-products?${params.toString()}&limit=8`),
      ]);
      setSummary(summary);
      setTopProducts(products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
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
        <h1 className="text-xl font-semibold text-neutral-900">Rapports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            <option value="">Toutes les boutiques</option>
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
              label="Chiffre d'affaires net"
              value={formatDZD(summary.netRevenueCents)}
              hint={`${summary.salesCount} vente${summary.salesCount > 1 ? 's' : ''}`}
            />
            <StatTile label="Panier moyen" value={formatDZD(summary.averageBasketCents)} />
            <StatTile label="TVA collectée" value={formatDZD(summary.taxCollectedCents)} />
            <StatTile
              label="Retours"
              value={formatDZD(summary.refundsCents)}
              hint={`${summary.refundsCount} retour${summary.refundsCount > 1 ? 's' : ''}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-neutral-700">Chiffre d'affaires par jour</h2>
              <RevenueBarChart data={summary.revenueByDay} />
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
              <h2 className="mb-4 text-sm font-semibold text-neutral-700">Répartition par moyen de paiement</h2>
              <PaymentBreakdown data={summary.revenueByPaymentMethod} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">Produits les plus vendus</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="py-1.5">Produit</th>
                  <th className="py-1.5">Quantité vendue</th>
                  <th className="py-1.5 text-right">Chiffre d'affaires</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1.5 text-neutral-900">
                      <span className="mr-2 inline-block w-4 text-right text-xs text-neutral-400">{i + 1}</span>
                      {p.name.fr}
                    </td>
                    <td className="py-1.5 text-neutral-600">{p.quantity}</td>
                    <td className="py-1.5 text-right font-medium text-neutral-900">{formatDZD(p.revenueCents)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-neutral-500">
                      Aucune vente sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!summary && !loading && <p className="text-sm text-neutral-500">Aucune donnée.</p>}
    </div>
  );
}
