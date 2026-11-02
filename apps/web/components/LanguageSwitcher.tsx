'use client';

import { useTranslation } from '../lib/i18n/LanguageContext';
import type { Locale } from '../lib/i18n/translations';

interface Props {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: Props) {
  const { locale, setLocale, t } = useTranslation();
  const next: Locale = locale === 'fr' ? 'ar' : 'fr';

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={`${t('languageSwitcher.label')}: ${t(`languageSwitcher.${next}`)}`}
      title={t(`languageSwitcher.${next}`)}
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
      </svg>
    </button>
  );
}
