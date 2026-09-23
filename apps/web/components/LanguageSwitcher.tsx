'use client';

import { useTranslation } from '../lib/i18n/LanguageContext';
import type { Locale } from '../lib/i18n/translations';

const OPTIONS: Locale[] = ['fr', 'ar'];

interface Props {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: Props) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('languageSwitcher.label')}
      className={`flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 text-xs font-semibold ${className}`}
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className={`rounded-md px-2.5 py-1.5 transition ${
            locale === option ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {t(`languageSwitcher.${option}`)}
        </button>
      ))}
    </div>
  );
}
