import type { Locale } from './i18n/LanguageContext';

// -u-nu-latn force les chiffres latins même en arabe : l'Algérie (contrairement au Golfe ou à
// l'Égypte) utilise les chiffres occidentaux en contexte commercial, et un ticket de caisse avec
// des chiffres indo-arabes surprendrait plus qu'il n'aiderait.
const LOCALE_TAG: Record<Locale, string> = {
  fr: 'fr-DZ-u-nu-latn',
  ar: 'ar-DZ-u-nu-latn',
};

// Intl en arabe entoure montants et dates de marques RLM (U+200F) : dans une page RTL, les groupes
// de chiffres et les segments de date s'affichent alors à l'envers (2026/11/2). On retire ces
// marques et on isole la valeur en LTR (LRI…PDI) pour que les chiffres restent dans le bon sens.
const RLM = /‏/g;
function ltr(value: string, locale: Locale): string {
  return locale === 'ar' ? `⁦${value.replace(RLM, '')}⁩` : value;
}

export function formatCurrency(cents: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return ltr(new Intl.NumberFormat(LOCALE_TAG[locale], { style: 'currency', currency: 'DZD', ...options }).format(cents / 100), locale);
}

export function formatDateTime(iso: string, locale: Locale): string {
  return ltr(new Date(iso).toLocaleString(LOCALE_TAG[locale]), locale);
}

export function formatDate(iso: string | Date, locale: Locale): string {
  return ltr(new Date(iso).toLocaleDateString(LOCALE_TAG[locale]), locale);
}

export function formatTime(iso: string | Date, locale: Locale): string {
  return ltr(new Date(iso).toLocaleTimeString(LOCALE_TAG[locale], { hour: '2-digit', minute: '2-digit' }), locale);
}

export function formatDayLabel(iso: string, locale: Locale): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE_TAG[locale], { day: '2-digit', month: 'short' });
}
