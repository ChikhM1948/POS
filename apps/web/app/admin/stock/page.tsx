'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { StockMovementPanel } from '../../../components/admin/StockMovementPanel';
import type { StockBalanceDTO, StoreDTO } from '@pos-dz/shared';

export default function StockPage() {
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [balances, setBalances] = useState<StockBalanceDTO[]>([]);
  const [selected, setSelected] = useState<StockBalanceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores')
      .then(({ stores }) => {
        setStores(stores);
        setStoreId((current) => current || stores[0]?.id || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur.'));
  }, [session]);

  const loadBalances = useCallback(async () => {
    if (!session || !storeId) return;
    setLoading(true);
    try {
      const { balances } = await adminFetch<{ balances: StockBalanceDTO[] }>(session.token, `/stock/balances?storeId=${storeId}`);
      setBalances(balances);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
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
        <h1 className="text-xl font-semibold text-neutral-900">Stock</h1>
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

      {selected && (
        <StockMovementPanel
          storeId={storeId}
          product={selected}
          onClose={() => setSelected(null)}
          onMovementCreated={loadBalances}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Produit</th>
              <th className="px-4 py-2">Stock actuel</th>
              <th className="px-4 py-2">Seuil critique</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => {
              const isLow = b.lowStockThreshold !== undefined && b.quantity <= b.lowStockThreshold;
              return (
                <tr key={b.productId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-neutral-900">{b.name.fr}</p>
                    <p className="font-mono text-xs text-neutral-500">{b.sku}</p>
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${isLow ? 'text-red-600' : 'text-neutral-900'}`}>
                    {b.quantity} {b.unit}
                    {isLow && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Stock faible</span>}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{b.lowStockThreshold ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setSelected(b)} className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
                      Mouvement / historique
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && balances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Aucun produit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
