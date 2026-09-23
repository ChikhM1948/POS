'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { LedgerEntryDTO } from '@pos-dz/shared';

interface Props {
  title: string;
  ledgerPath: string; // ex. /suppliers/:id/ledger
  paymentPath: string; // ex. /suppliers/:id/payments
  onClose: () => void;
  onPaymentRecorded: () => void;
}

/** Historique + encaissement de paiement pour un fournisseur ou un client — même ledger append-only
 * des deux côtés (voir SupplierLedgerEntry/CustomerLedgerEntry), seuls les endpoints diffèrent. */
export function LedgerPanel({ title, ledgerPath, paymentPath, onClose, onPaymentRecorded }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [entries, setEntries] = useState<LedgerEntryDTO[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    const { entries } = await adminFetch<{ entries: LedgerEntryDTO[] }>(session.token, ledgerPath);
    setEntries(entries);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, ledgerPath]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminFetch(session.token, paymentPath, {
        method: 'POST',
        body: JSON.stringify({ amountCents: Math.round(parseFloat(amount.replace(',', '.') || '0') * 100), note: note || undefined }),
      });
      setAmount('');
      setNote('');
      await load();
      onPaymentRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ledger.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
        <button onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          {t('common.close')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('ledger.paymentAmount')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-1 min-w-40 flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('ledger.paymentNote')}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('ledger.paymentNotePlaceholder')} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <button disabled={submitting} type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? t('common.saving') : t('ledger.paymentSubmit')}
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <h4 className="mb-2 text-sm font-semibold text-neutral-700">{t('ledger.historyTitle')}</h4>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-1.5">{t('ledger.tableDate')}</th>
              <th className="px-3 py-1.5">{t('ledger.tableType')}</th>
              <th className="px-3 py-1.5">{t('ledger.tableAmount')}</th>
              <th className="px-3 py-1.5">{t('ledger.tableNote')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-1.5">{formatDateTime(e.createdAtLocal, locale)}</td>
                <td className="px-3 py-1.5">{t(`ledger.types.${e.type}`)}</td>
                <td className={`px-3 py-1.5 font-medium ${e.amountCents < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {e.amountCents > 0 ? '+' : ''}
                  {formatDZD(e.amountCents)}
                </td>
                <td className="px-3 py-1.5 text-neutral-500">{e.note ?? t('common.dash')}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
                  {t('ledger.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
