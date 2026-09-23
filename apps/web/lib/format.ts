import type { Locale } from './i18n/LanguageContext';

// -u-nu-latn force les chiffres latins même en arabe : l'Algérie (contrairement au Golfe ou à
// l'Égypte) utilise les chiffres occidentaux en contexte commercial, et un ticket de caisse avec
// des chiffres indo-arabes surprendrait plus qu'il n'aiderait.
const LOCALE_TAG: Record<Locale, string> = {
  fr: 'fr-DZ-u-nu-latn',
  ar: 'ar-DZ-u-nu-latn',
};

export function formatCurrency(cents: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], { style: 'currency', currency: 'DZD', ...options }).format(cents / 100);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(LOCALE_TAG[locale]);
}

export function formatDayLabel(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE_TAG[locale], { day: '2-digit', month: 'short' });
}
