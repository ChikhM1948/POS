'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { DateRangeFilter, type DateRangeValue } from '../../../components/admin/DateRangeFilter';
import { resolvePreset } from '../../../lib/dateRangePresets';
import { RefundForm } from '../../../components/admin/RefundForm';
import type { SaleDetailDTO, SaleListItemDTO, SalesListResponse, StoreDTO } from '@pos-dz/shared';

const formatDZD = (cents: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  cib: 'CIB',
  edahabia: 'Edahabia',
  cheque: 'Chèque',
  credit: 'Crédit',
  voucher: 'Bon d\'achat',
};

export default function SalesPage() {
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState<DateRangeValue>(resolvePreset('7d'));
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<SaleListItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<SaleDetailDTO | null>(null);
  const [refunding, setRefunding] = useState(false);
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
      if (search) params.set('search', search);
      const { sales, total } = await adminFetch<SalesListResponse>(session.token, `/sales?${params.toString()}`);
      setSales(sales);
      setTotal(total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [session, storeId, range, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(saleId: string) {
    if (!session) return;
    setRefunding(false);
    const { sale } = await adminFetch<{ sale: SaleDetailDTO }>(session.token, `/sales/${saleId}`);
    setSelected(sale);
  }

  async function handleRefundCreated() {
    setRefunding(false);
    if (selected) await openDetail(selected.id);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">Ventes {total > 0 && <span className="text-sm font-normal text-neutral-500">({total})</span>}</h1>
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="N° de ticket…"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {selected && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              Ticket {selected.number}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  selected.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selected.type === 'refund' ? 'Retour' : 'Vente'}
              </span>
            </h3>
            <button onClick={() => setSelected(null)} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
              Fermer
            </button>
          </div>
          <p className="mb-3 text-sm text-neutral-500">
            {new Date(selected.createdAtLocal).toLocaleString('fr-DZ')} · Caissier : {selected.cashierName}
          </p>
          <table className="mb-3 w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1.5">Article</th>
                <th className="py-1.5">Qté</th>
                <th className="py-1.5">PU</th>
                <th className="py-1.5">TVA</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selected.lines.map((l, i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1.5">{l.name.fr}</td>
                  <td className="py-1.5">{l.quantity}</td>
                  <td className="py-1.5">{formatDZD(l.unitPriceCents)}</td>
                  <td className="py-1.5">{l.taxRate}%</td>
                  <td className="py-1.5 text-right">{formatDZD(l.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col items-end gap-1 text-sm text-neutral-600">
            <p>Sous-total : {formatDZD(selected.totals.subtotalCents)}</p>
            <p>TVA : {formatDZD(selected.totals.taxTotalCents)}</p>
            {selected.totals.stampDutyCents > 0 && <p>Timbre fiscal : {formatDZD(selected.totals.stampDutyCents)}</p>}
            <p className="text-base font-semibold text-neutral-900">Total : {formatDZD(selected.totals.grandTotalCents)}</p>
            <p className="text-neutral-500">
              Paiement : {selected.payments.map((p) => `${PAYMENT_LABELS[p.method] ?? p.method} (${formatDZD(p.amountCents)})`).join(', ')}
            </p>
          </div>

          {selected.type === 'refund' && (
            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-500">Ceci est un retour lié à une vente d'origine.</p>
          )}

          {selected.type === 'sale' && (
            <>
              {selected.refunds && selected.refunds.length > 0 && (
                <div className="mt-4 border-t border-neutral-200 pt-3">
                  <p className="mb-2 text-sm font-medium text-neutral-500">Retours déjà effectués</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {selected.refunds.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>
                          {r.number} · {new Date(r.createdAtLocal).toLocaleString('fr-DZ')}
                        </span>
                        <span className="font-medium text-red-600">-{formatDZD(r.grandTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!refunding &&
                (selected.refundedQuantities?.some((refunded, i) => refunded < selected.lines[i].quantity) ?? true) && (
                  <div className="mt-4 flex justify-end border-t border-neutral-200 pt-3">
                    <button onClick={() => setRefunding(true)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50">
                      Faire un retour
                    </button>
                  </div>
                )}

              {refunding && <RefundForm sale={selected} onClose={() => setRefunding(false)} onRefundCreated={handleRefundCreated} />}
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Ticket</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Caissier</th>
              <th className="px-4 py-2">Paiement</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} onClick={() => openDetail(s.id)} className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  {s.number}
                  {s.type === 'refund' && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Retour</span>}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{new Date(s.createdAtLocal).toLocaleString('fr-DZ')}</td>
                <td className="px-4 py-2.5 text-neutral-600">{s.cashierName}</td>
                <td className="px-4 py-2.5 text-neutral-600">{s.paymentMethods.map((m) => PAYMENT_LABELS[m] ?? m).join(', ')}</td>
                <td className="px-4 py-2.5 text-right font-medium text-neutral-900">{formatDZD(s.grandTotalCents)}</td>
              </tr>
            ))}
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Aucune vente sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
