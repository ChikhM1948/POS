'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { CustomerForm } from '../../../components/admin/CustomerForm';
import { LedgerPanel } from '../../../components/admin/LedgerPanel';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { IconPlus } from '../../../components/icons';
import type { CreateCustomerInput, CustomerDTO } from '@pos-dz/shared';

export default function CustomersPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [openLedgerId, setOpenLedgerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { customers } = await adminFetch<{ customers: CustomerDTO[] }>(session.token, '/customers');
      setCustomers(customers);
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

  async function handleSubmit(input: CreateCustomerInput) {
    if (!session) return;
    await adminFetch(session.token, '/customers', { method: 'POST', body: JSON.stringify(input) });
    setShowForm(false);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{t('customers.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          {t('customers.newCustomer')}
        </button>
      </div>

      {showForm && <CustomerForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">{t('customers.tableName')}</th>
              <th className="px-4 py-2">{t('customers.tablePhone')}</th>
              <th className="px-4 py-2">{t('customers.tableBalance')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">{c.name}</td>
                <td className="px-4 py-2.5 text-neutral-600">{c.phone ?? t('common.dash')}</td>
                <td className={`px-4 py-2.5 font-medium ${c.balanceCents > 0 ? 'text-red-600' : 'text-neutral-600'}`}>{formatDZD(c.balanceCents)}</td>
                <td className="px-4 py-2.5 text-end">
                  <button onClick={() => setOpenLedgerId(c.id)} className="text-sm font-medium text-brand-700 hover:underline">
                    {t('ledger.historyTitle')}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  {t('customers.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openLedgerId && (
        <LedgerPanel
          title={customers.find((c) => c.id === openLedgerId)?.name ?? ''}
          ledgerPath={`/customers/${openLedgerId}/ledger`}
          paymentPath={`/customers/${openLedgerId}/payments`}
          onClose={() => setOpenLedgerId(null)}
          onPaymentRecorded={load}
        />
      )}
    </div>
  );
}
