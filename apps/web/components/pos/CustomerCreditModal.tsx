'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getOfflineDB, type LocalCustomer } from '../../lib/db/offline-db';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';
import { IconCreditCard, IconX } from '../icons';

interface Props {
  deviceId: string;
  totalCents: number;
  onCancel: () => void;
  onConfirm: (customerId: string, paidNowCents: number) => void;
  submitting: boolean;
}

/**
 * Vente à crédit ("Karna") : le caissier choisit un client déjà synchronisé (hors-ligne — voir
 * db.customers dans offline-db.ts) et saisit ce qu'il reçoit maintenant, s'il reçoit quelque chose.
 * Le reste est enregistré comme dette sur ce client au moment de la synchro de la vente.
 */
export function CustomerCreditModal({ deviceId, totalCents, onCancel, onConfirm, submitting }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const db = useMemo(() => getOfflineDB(deviceId), [deviceId]);
  const customers = useLiveQuery(() => db.customers.toArray(), [db]) ?? [];

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LocalCustomer | null>(null);
  const [paidNowInput, setPaidNowInput] = useState('');

  const filtered = customers.filter((c) => !query.trim() || c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const paidNowCents = Math.min(totalCents, Math.max(0, Math.round(parseFloat(paidNowInput.replace(',', '.') || '0') * 100)));
  const remainingCents = totalCents - paidNowCents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
        <div className="flex items-center justify-between bg-neutral-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <IconCreditCard className="h-5 w-5" />
            <p className="text-sm font-semibold">{t('creditModal.title')}</p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-neutral-300 transition hover:bg-white/10 hover:text-white">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-3">
            <span className="text-sm font-medium text-neutral-500">{t('cashModal.totalToPay')}</span>
            <span className="text-xl font-bold text-neutral-900">{formatDZD(totalCents)}</span>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('creditModal.customerLabel')}
            <input
              value={selected ? selected.name : query}
              onChange={(e) => {
                setSelected(null);
                setQuery(e.target.value);
              }}
              placeholder={t('creditModal.customerPlaceholder')}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
            />
          </label>

          {!selected && query.trim() && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setQuery('');
                  }}
                  className="block w-full px-3 py-2 text-start text-sm text-neutral-900 hover:bg-neutral-50"
                >
                  {c.name}
                  {c.phone && <span className="ms-2 text-xs text-neutral-400">{c.phone}</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-neutral-400">{t('creditModal.noResults')}</p>}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('creditModal.amountPaidNow')}
            <input
              value={paidNowInput}
              onChange={(e) => setPaidNowInput(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
            />
          </label>

          <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
            <span className="text-sm font-medium text-amber-700">{t('creditModal.remaining', { amount: formatDZD(remainingCents) })}</span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
            {t('common.cancel')}
          </button>
          <button
            disabled={!selected || submitting}
            onClick={() => selected && onConfirm(selected.id, paidNowCents)}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('creditModal.confirming') : t('creditModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
