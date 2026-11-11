'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';
import { lineTotalCents, roundQty } from '../../lib/pricing';
import { IconX } from '../icons';

interface Props {
  name: string;
  unit: string;
  unitPriceCents: number;
  initialQuantity?: number;
  onCancel: () => void;
  onConfirm: (quantity: number) => void;
}

/** Saisie du poids (ou de la quantité fractionnaire) d'un produit vendu au poids. */
export function WeightModal({ name, unit, unitPriceCents, initialQuantity, onCancel, onConfirm }: Props) {
  const { t, locale } = useTranslation();
  const [input, setInput] = useState(initialQuantity ? String(initialQuantity) : '');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const quantity = roundQty(parseFloat(input.replace(',', '.')) || 0);
  const valid = quantity > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center scrim p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onConfirm(quantity);
        }}
        className="flex w-full max-w-sm flex-col sheet overflow-hidden rounded-2xl bg-white shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 text-neutral-900">
          <p className="text-sm font-semibold">{t('weightModal.title', { name })}</p>
          <button type="button" onClick={onCancel} className="rounded-lg p-1 bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('weightModal.label', { unit })}
            <input
              ref={ref}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="decimal"
              placeholder="0.000"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-lg text-neutral-900 focus:border-brand-500"
            />
          </label>
          <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-4 py-3">
            <span className="text-sm text-neutral-500">{formatCurrency(unitPriceCents, locale)} / {unit}</span>
            <span className="text-xl font-bold text-neutral-900">{formatCurrency(lineTotalCents(unitPriceCents, quantity, 0), locale)}</span>
          </div>
        </div>
        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border-2 border-brand-200 py-4 text-base font-bold text-neutral-700 hover:bg-neutral-50">
            {t('common.cancel')}
          </button>
          <button disabled={!valid} type="submit" className="flex-1 rounded-2xl bg-signal-500 py-4 text-base font-bold text-ink hover:bg-signal-400 disabled:cursor-not-allowed disabled:opacity-50">
            {t('weightModal.confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
