'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { SupplierForm } from '../../../components/admin/SupplierForm';
import { SupplierPriceHistoryPanel } from '../../../components/admin/SupplierPriceHistoryPanel';
import { LedgerPanel } from '../../../components/admin/LedgerPanel';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { StatTile } from '../../../components/admin/reports/StatTile';
import { IconPlus, IconSearch } from '../../../components/icons';
import type { SupplierDTO, SupplierInput } from '@pos-dz/shared';

export default function SuppliersPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [priceSupplierId, setPriceSupplierId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Record<string, number>>({});
  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);
  const [ledgerMode, setLedgerMode] = useState<'payment' | 'debt'>('payment');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { suppliers } = await adminFetch<{ suppliers: SupplierDTO[] }>(session.token, '/suppliers');
      setSuppliers(suppliers);
      adminFetch<{ alerts: Record<string, number> }>(session.token, '/suppliers/price-alerts').then((r) => setAlerts(r.alerts)).catch(() => undefined);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const withBalance = suppliers.filter((x) => x.balanceCents > 0);
  const totalCents = withBalance.reduce((sum, x) => sum + x.balanceCents, 0);
  const visible = suppliers
    .filter((x) => !onlyWithBalance || x.balanceCents > 0)
    .filter((x) => !search.trim() || x.name.toLowerCase().includes(search.trim().toLowerCase()) || (x.phone ?? '').includes(search.trim()))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  async function handleSubmit(input: SupplierInput, openingBalanceCents?: number) {
    if (!session) return;
    const { supplier } = await adminFetch<{ supplier: { id: string } }>(session.token, '/suppliers', { method: 'POST', body: JSON.stringify(input) });
    if (openingBalanceCents) {
      await adminFetch(session.token, `/suppliers/${supplier.id}/debts`, {
        method: 'POST',
        body: JSON.stringify({ amountCents: openingBalanceCents, note: 'Solde initial' }),
      });
    }
    setShowForm(false);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('suppliers.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          {t('suppliers.newSupplier')}
        </button>
      </div>

      {showForm && <SupplierForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label={t('suppliers.totalLabel')} value={formatDZD(totalCents)} hint={t('suppliers.countLabel', { count: String(withBalance.length) })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('suppliers.searchPlaceholder')}
            className="w-full rounded-lg border border-neutral-300 py-2 ps-9 pe-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={onlyWithBalance} onChange={(e) => setOnlyWithBalance(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          {t('suppliers.onlyWithBalance')}
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-3">{t('suppliers.tableName')}</th>
              <th className="px-4 py-3">{t('suppliers.tablePhone')}</th>
              <th className="px-4 py-3">{t('suppliers.tableBalance')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  {s.name}
                  {alerts[s.id] > 0 && <span className="ms-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">▲ {t('priceHistory.alertBadge', { count: alerts[s.id] })}</span>}
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{s.phone ?? t('common.dash')}</td>
                <td className={`px-4 py-2.5 font-medium ${s.balanceCents > 0 ? 'text-red-600' : 'text-neutral-600'}`}>{formatDZD(s.balanceCents)}</td>
                <td className="px-4 py-2.5 text-end">
                  <button onClick={() => setPriceSupplierId(s.id)} className="me-3 text-sm font-medium text-neutral-600 hover:underline">
                    {t('priceHistory.button')}
                  </button>
                  <button onClick={() => { setLedgerMode('payment'); setOpenLedgerId(s.id); }} className="me-3 text-sm font-medium text-brand-700 hover:underline">
                    {s.balanceCents > 0 ? t('suppliers.settle') : t('ledger.historyTitle')}
                  </button>
                  <button onClick={() => { setLedgerMode('debt'); setOpenLedgerId(s.id); }} className="text-sm font-medium text-neutral-600 hover:underline">
                    + {t('suppliers.addDebt')}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  {t('suppliers.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {priceSupplierId && (
        <SupplierPriceHistoryPanel
          key={priceSupplierId}
          supplierId={priceSupplierId}
          supplierName={suppliers.find((s) => s.id === priceSupplierId)?.name ?? ''}
          onClose={() => setPriceSupplierId(null)}
        />
      )}

      {openLedgerId && (
        <LedgerPanel
          key={`${openLedgerId}-${ledgerMode}`}
          initialMode={ledgerMode}
          debtPath={`/suppliers/${openLedgerId}/debts`}
          addDebtLabel={t('suppliers.addDebt')}
          paymentLabel={t('ledger.modePayment')}
          title={suppliers.find((s) => s.id === openLedgerId)?.name ?? ''}
          ledgerPath={`/suppliers/${openLedgerId}/ledger`}
          paymentPath={`/suppliers/${openLedgerId}/payments`}
          onClose={() => setOpenLedgerId(null)}
          onPaymentRecorded={load}
        />
      )}
    </div>
  );
}
