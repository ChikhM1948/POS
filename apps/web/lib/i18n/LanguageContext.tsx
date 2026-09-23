'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Locale, type TranslationDict } from './translations';

const STORAGE_KEY = 'pos-language';
const DEFAULT_LOCALE: Locale = 'fr';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  t: (path: DotPath<TranslationDict>, vars?: Record<string, string | number>) => string;
}

// Chemins pointés valides sur l'arbre de traduction (ex. "pos.cart.title") — vérifié à la
// compilation pour éviter les clés fantômes entre fr et ar, qui doivent rester en miroir strict.
type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : DotPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'ar') setLocaleState(stored);
    } catch {
      // stockage indisponible (navigation privée) — reste sur la langue par défaut
    }
  }, []);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // voir ci-dessus
    }
  }

  const t = useMemo(() => {
    return (path: DotPath<TranslationDict>, vars?: Record<string, string | number>) => {
      const raw = getByPath(translations[locale], path);
      let str = typeof raw === 'string' ? raw : path;
      if (vars) {
        for (const [key, value] of Object.entries(vars)) {
          str = str.replace(`{${key}}`, String(value));
        }
      }
      return str;
    };
  }, [locale]);

  return <LanguageContext.Provider value={{ locale, setLocale, dir, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation doit être utilisé sous LanguageProvider');
  return ctx;
}

export type { Locale };
