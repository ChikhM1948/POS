'use client';

import { useMemo, useState } from 'react';
import { IconBanknote, IconX } from '../icons';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';

interface Props {
  totalCents: number;
  onCancel: () => void;
  onConfirm: (tenderedCents: number) => void;
  submitting: boolean;
}

const QUICK_NOTES_DZD = [500, 1000, 2000, 5000];

/** Saisie du montant reçu en espèces + calcul de la monnaie à rendre — flux standard caisse physique. */
export function CashPaymentModal({ totalCents, onCancel, onConfirm, submitting }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const [digits, setDigits] = useState(''); // montant en DZD (unité entière), saisi chiffre par chiffre

  const tenderedCents = digits ? parseInt(digits, 10) * 100 : 0;
  const changeCents = Math.max(0, tenderedCents - totalCents);
  const isSufficient = tenderedCents >= totalCents;

  const exactAmountDZD = useMemo(() => Math.round(totalCents / 100), [totalCents]);

  function pressDigit(d: string) {
    setDigits((prev) => (prev.length >= 9 ? prev : prev + d));
  }

  function backspace() {
    setDigits((prev) => prev.slice(0, -1));
  }

  function setQuickDZD(amountDZD: number) {
    setDigits(String(amountDZD));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
        <div className="flex items-center justify-between bg-neutral-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <IconBanknote className="h-5 w-5" />
            <p className="text-sm font-semibold">{t('cashModal.title')}</p>
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

          <div className="flex flex-col items-end gap-1 rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{t('cashModal.amountReceived')}</span>
            <span className="text-3xl font-bold tabular-nums text-brand-900">{formatDZD(tenderedCents)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setQuickDZD(exactAmountDZD)}
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              {t('cashModal.exact')}
            </button>
            {QUICK_NOTES_DZD.map((amount) => (
              <button
                key={amount}
                onClick={() => setQuickDZD(amount)}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((key) => (
              <button
                key={key}
                onClick={() => (key === '⌫' ? backspace() : pressDigit(key))}
                className="rounded-xl bg-neutral-100 py-3.5 text-lg font-semibold text-neutral-900 transition hover:bg-neutral-200 active:bg-neutral-300"
              >
                {key}
              </button>
            ))}
          </div>

          {tenderedCents > 0 && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isSufficient ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <span className={`text-sm font-medium ${isSufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                {isSufficient ? t('cashModal.changeDue') : t('cashModal.insufficientAmount')}
              </span>
              <span className={`text-lg font-bold ${isSufficient ? 'text-emerald-700' : 'text-red-700'}`}>
                {isSufficient ? formatDZD(changeCents) : formatDZD(totalCents - tenderedCents)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={!isSufficient || submitting}
            onClick={() => onConfirm(tenderedCents)}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('cashModal.confirming') : t('cashModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
