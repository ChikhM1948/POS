'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminFetch } from './adminApi';
import type { TenantSettingsDTO } from '@pos-dz/shared';

export interface Branding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const STORAGE_KEY = 'pos-branding';
/** Valeurs par défaut historiques du modèle Tenant : considérées « non personnalisées » → on garde le thème d'origine. */
const LEGACY_DEFAULTS = new Set(['#0f172a', '#38bdf8']);
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export const HEX_RE = /^#[0-9a-f]{6}$/i;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(rgb: [number, number, number], target: number, amount: number): [number, number, number] {
  return rgb.map((c) => Math.round(c + (target - c) * amount)) as [number, number, number];
}

/** Échelle 50→950 dérivée d'une couleur de base, qui devient la teinte 600 (boutons, éléments actifs). */
export function buildScale(hex: string): Record<(typeof SHADES)[number], [number, number, number]> {
  const base = hexToRgb(hex);
  return {
    50: mix(base, 255, 0.95), 100: mix(base, 255, 0.9), 200: mix(base, 255, 0.8), 300: mix(base, 255, 0.62),
    400: mix(base, 255, 0.4), 500: mix(base, 255, 0.2), 600: base,
    700: mix(base, 0, 0.25), 800: mix(base, 0, 0.45), 900: mix(base, 0, 0.62), 950: mix(base, 0, 0.75),
  };
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contraste WCAG du texte blanc sur cette couleur (les boutons de l'app ont un texte blanc fixe). */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hexToRgb(hex)) + 0.05);
}

/** Écrit (ou retire) les variables CSS lues par la palette Tailwind `brand` — voir tailwind.config.ts / globals.css. */
export function applyBranding(b: Branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const primary = b.primaryColor && HEX_RE.test(b.primaryColor) && !LEGACY_DEFAULTS.has(b.primaryColor.toLowerCase()) ? b.primaryColor : null;
  const secondary = b.secondaryColor && HEX_RE.test(b.secondaryColor) && !LEGACY_DEFAULTS.has(b.secondaryColor.toLowerCase()) ? b.secondaryColor : null;
  if (primary) {
    const scale = buildScale(primary);
    for (const s of SHADES) root.setProperty(`--brand-${s}`, scale[s].join(' '));
  } else {
    for (const s of SHADES) root.removeProperty(`--brand-${s}`);
  }
  if (secondary) root.setProperty('--accent', hexToRgb(secondary).join(' '));
  else root.removeProperty('--accent');
}

interface BrandingContextValue {
  branding: Branding;
  setBranding: (b: Branding) => void;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: {}, setBranding: () => {} });

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setState] = useState<Branding>({});

  // Dernière charte connue (localStorage) : appliquée dès le montage, avant tout appel réseau,
  // et disponible hors-ligne.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Branding;
        setState(cached);
        applyBranding(cached);
      }
    } catch {
      /* stockage indisponible — le thème par défaut s'applique */
    }
  }, []);

  const setBranding = useCallback((b: Branding) => {
    setState(b);
    applyBranding(b);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    } catch {
      /* quota (logo volumineux) ou stockage indisponible — le serveur reste la source de vérité */
    }
  }, []);

  const value = useMemo(() => ({ branding, setBranding }), [branding, setBranding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

/** Charge la charte du commerce depuis le serveur (lecture ouverte à tous les rôles) et l'applique. */
export function useLoadBranding(token: string | undefined) {
  const { setBranding } = useBranding();
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    adminFetch<{ tenant: TenantSettingsDTO }>(token, '/tenant')
      .then(({ tenant }) => { if (!cancelled) setBranding(tenant.branding); })
      .catch(() => { /* hors-ligne : on garde la charte en cache */ });
    return () => { cancelled = true; };
  }, [token, setBranding]);
}
