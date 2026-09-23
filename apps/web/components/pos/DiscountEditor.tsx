'use client';

import { useState } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';
import { IconMinus } from '../icons';

interface Props {
  quantity: number;
  unitPriceCents: number;
  minSellingPriceCents?: number;
  discountCents: number;
  onApply: (discountCents: number) => void;
}

/**
 * Remise par ligne, saisie en DZD. Si un prix de vente minimum est configuré sur le produit
 * (Product.minSellingPriceCents) et que la remise ferait passer le prix net sous ce plancher, on
 * affiche un avertissement — mais la vente reste possible : décision produit, voir plan de la
 * fonctionnalité.
 */
export function DiscountEditor({ quantity, unitPriceCents, minSellingPriceCents, discountCents, onApply }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(discountCents > 0 ? String(Math.round(discountCents / 100)) : '');

  const candidateDiscountCents = Math.max(0, Math.round(parseFloat(input.replace(',', '.') || '0') * 100));
  const netUnitCents = quantity > 0 ? (unitPriceCents * quantity - candidateDiscountCents) / quantity : unitPriceCents;
  const belowFloor = minSellingPriceCents !== undefined && netUnitCents < minSellingPriceCents;

  function apply() {
    onApply(Math.min(candidateDiscountCents, unitPriceCents * quantity));
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700">
        <IconMinus className="h-3 w-3" />
        {discountCents > 0 ? `-${formatDZD(discountCents)}` : t('discountEditor.button')}
      </button>
    );
  }

  return (
    <div className="absolute inset-x-3 top-full z-10 mt-1 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-popover">
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        {t('discountEditor.label')}
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-900 focus:border-brand-500"
        />
      </label>
      {belowFloor && <p className="text-xs font-medium text-amber-600">{t('discountEditor.marginWarning')}</p>}
      <div className="flex gap-2">
        <button onClick={apply} className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700">
          {t('discountEditor.apply')}
        </button>
        <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-neutral-300 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
