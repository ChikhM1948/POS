import React from 'react';
import { formatCurrency } from '../../lib/format';
import { translations, type Locale } from '../../lib/i18n/translations';

/** Le prix d'achat reste interne à la caisse, jamais ajouté au ticket client. */
export function PurchasePrice({ allowed, cents, locale, unit }: {
  allowed?: boolean;
  cents?: number;
  locale: Locale;
  unit?: string;
}) {
  if (allowed !== true || cents === undefined) return null;
  return (
    <p className="text-xs text-neutral-500">
      {translations[locale].pos.purchasePrice}: {formatCurrency(cents, locale)}{unit ? ` / ${unit}` : ''}
    </p>
  );
}
