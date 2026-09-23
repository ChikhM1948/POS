'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { DateRangeFilter, type DateRangeValue } from '../../../components/admin/DateRangeFilter';
import { resolvePreset } from '../../../lib/dateRangePresets';
import { RefundForm } from '../../../components/admin/RefundForm';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../../lib/format';
import type { SaleDetailDTO, SaleListItemDTO, SalesListResponse, StoreDTO } from '@pos-dz/shared';

const PAYMENT_METHODS = ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'] as const;

export default function SalesPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
    PAYMENT_METHODS.map((m) => [m, t(`sales.payment.${m}`)]),
  );
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
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
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
        <h1 className="text-xl font-semibold text-neutral-900">
          {t('sales.title')} {total > 0 && <span className="text-sm font-normal text-neutral-500">({total})</span>}
        </h1>
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sales.searchPlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {selected && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              {t('sales.ticket', { number: selected.number })}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  selected.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selected.type === 'refund' ? t('sales.typeRefund') : t('sales.typeSale')}
              </span>
            </h3>
            <button onClick={() => setSelected(null)} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
              {t('common.close')}
            </button>
          </div>
          <p className="mb-3 text-sm text-neutral-500">
            {formatDateTime(selected.createdAtLocal, locale)} · {t('sales.cashier', { name: selected.cashierName })}
          </p>
          <table className="mb-3 w-full text-sm">
            <thead className="border-b border-neutral-200 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1.5">{t('sales.tableItem')}</th>
                <th className="py-1.5">{t('sales.tableQty')}</th>
                <th className="py-1.5">{t('sales.tableUnitPrice')}</th>
                <th className="py-1.5">{t('sales.tableTax')}</th>
                <th className="py-1.5 text-end">{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {selected.lines.map((l, i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1.5">{l.name.fr}</td>
                  <td className="py-1.5">{l.quantity}</td>
                  <td className="py-1.5">{formatDZD(l.unitPriceCents)}</td>
                  <td className="py-1.5">{l.taxRate}%</td>
                  <td className="py-1.5 text-end">{formatDZD(l.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col items-end gap-1 text-sm text-neutral-600">
            <p>{t('sales.subtotalLine', { amount: formatDZD(selected.totals.subtotalCents) })}</p>
            <p>{t('sales.taxLine', { amount: formatDZD(selected.totals.taxTotalCents) })}</p>
            {selected.totals.stampDutyCents > 0 && (
              <p>{t('sales.stampDutyLine', { amount: formatDZD(selected.totals.stampDutyCents) })}</p>
            )}
            <p className="text-base font-semibold text-neutral-900">{t('sales.totalLine', { amount: formatDZD(selected.totals.grandTotalCents) })}</p>
            <p className="text-neutral-500">
              {t('sales.paymentLine', {
                methods: selected.payments.map((p) => `${PAYMENT_LABELS[p.method] ?? p.method} (${formatDZD(p.amountCents)})`).join(', '),
              })}
            </p>
          </div>

          {selected.type === 'refund' && (
            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-500">{t('sales.refundNotice')}</p>
          )}

          {selected.type === 'sale' && (
            <>
              {selected.refunds && selected.refunds.length > 0 && (
                <div className="mt-4 border-t border-neutral-200 pt-3">
                  <p className="mb-2 text-sm font-medium text-neutral-500">{t('sales.refundsDone')}</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {selected.refunds.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>
                          {r.number} · {formatDateTime(r.createdAtLocal, locale)}
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
                      {t('sales.makeRefund')}
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
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">{t('sales.tableTicket')}</th>
              <th className="px-4 py-2">{t('sales.tableDate')}</th>
              <th className="px-4 py-2">{t('sales.tableCashier')}</th>
              <th className="px-4 py-2">{t('sales.tablePayment')}</th>
              <th className="px-4 py-2 text-end">{t('common.total')}</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} onClick={() => openDetail(s.id)} className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  {s.number}
                  {s.type === 'refund' && <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{t('sales.typeRefund')}</span>}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{formatDateTime(s.createdAtLocal, locale)}</td>
                <td className="px-4 py-2.5 text-neutral-600">{s.cashierName}</td>
                <td className="px-4 py-2.5 text-neutral-600">{s.paymentMethods.map((m) => PAYMENT_LABELS[m] ?? m).join(', ')}</td>
                <td className="px-4 py-2.5 text-end font-medium text-neutral-900">{formatDZD(s.grandTotalCents)}</td>
              </tr>
            ))}
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  {t('sales.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
