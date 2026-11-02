'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LANDING_LOCALES, landingContent, type LandingLocale } from '../../lib/landing/content';

const STORAGE_KEY = 'landing-language';

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 rtl:rotate-180" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/** Drapeaux en SVG inline (aucune image externe, fonctionne hors-ligne). Arabe → drapeau algérien, le produit ciblant l'Algérie. */
function Flag({ code, className = 'h-5 w-5' }: { code: LandingLocale; className?: string }) {
  const cls = `${className} shrink-0 rounded-full ring-1 ring-black/10`;
  if (code === 'fr') {
    return (
      <svg viewBox="0 0 20 20" className={cls} aria-hidden="true">
        <rect width="7" height="20" fill="#0055A4" />
        <rect x="7" width="6" height="20" fill="#fff" />
        <rect x="13" width="7" height="20" fill="#EF4135" />
      </svg>
    );
  }
  if (code === 'ar') {
    return (
      <svg viewBox="0 0 20 20" className={cls} aria-hidden="true">
        <rect width="10" height="20" fill="#006233" />
        <rect x="10" width="10" height="20" fill="#fff" />
        <circle cx="10" cy="10" r="5" fill="#D21034" />
        <circle cx="11.3" cy="10" r="4.1" fill="#fff" />
        <polygon points={starPoints(11.2, 10, 2.3, 0.95)} fill="#D21034" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className={cls} aria-hidden="true">
      <rect width="20" height="20" fill="#012169" />
      <path d="M0 0 20 20M20 0 0 20" stroke="#fff" strokeWidth="3.6" />
      <path d="M0 0 20 20M20 0 0 20" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M10 0v20M0 10h20" stroke="#fff" strokeWidth="6" />
      <path d="M10 0v20M0 10h20" stroke="#C8102E" strokeWidth="3.4" />
    </svg>
  );
}

/** Bouton de langue : globe + drapeau + nom, menu déroulant avec les trois langues. */
function LanguageMenu({ value, onChange, label }: { value: LandingLocale; onChange: (l: LandingLocale) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANDING_LOCALES.find((l) => l.code === value)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current.name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="hidden h-4 w-4 text-neutral-500 sm:block" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
        <Flag code={value} className="h-5 w-5" />
        <span className="hidden sm:inline">{current.name}</span>
        <span className="sm:hidden">{current.short}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 text-neutral-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute end-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-popover">
          {LANDING_LOCALES.map((l) => {
            const active = l.code === value;
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  lang={l.code}
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition hover:bg-neutral-50 ${active ? 'font-semibold text-brand-800' : 'text-neutral-700'}`}
                >
                  <Flag code={l.code} className="h-6 w-6" />
                  <span className="flex-1 text-start">{l.name}</span>
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-700" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Screenshot({ src, alt, width, height, priority = false }: { src: string; alt: string; width: number; height: number; priority?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-neutral-300 bg-white">
      <div dir="ltr" className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
    </figure>
  );
}

export default function LandingPage() {
  const [locale, setLocale] = useState<LandingLocale>('fr');
  const [menuOpen, setMenuOpen] = useState(false);
  const c = landingContent[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  // L'application n'existe qu'en français et en arabe : l'anglais réutilise les captures françaises.
  const shot = locale === 'ar' ? 'ar' : 'fr';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('pos-language');
      if (stored === 'fr' || stored === 'ar' || stored === 'en') setLocale(stored);
      else if (navigator.language.startsWith('ar')) setLocale('ar');
      else if (navigator.language.startsWith('en')) setLocale('en');
    } catch {
      /* stockage indisponible : langue par défaut */
    }
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.title = c.meta.title;
  }, [locale, dir, c.meta.title]);

  function changeLocale(next: LandingLocale) {
    setLocale(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignoré */
    }
  }

  const navLinks = [
    { href: '#features', label: c.nav.features },
    { href: '#how', label: c.nav.how },
    { href: '#offline', label: c.nav.offline },
    { href: '#faq', label: c.nav.faq },
  ];
  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700';
  const btnSecondary = 'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50';

  const sections = [
    { key: 'pos', data: c.showcase.pos, img: `/screens/pos-${shot}.webp`, w: 1600, h: 958, bg: 'bg-white' },
    { key: 'stock', data: c.showcase.stock, img: `/screens/stock-${shot}.webp`, w: 1600, h: 1000, bg: 'bg-neutral-50' },
    { key: 'reports', data: c.showcase.reports, img: `/screens/reports-${shot}.webp`, w: 1600, h: 1000, bg: 'bg-white' },
  ] as const;

  return (
    <div dir={dir} lang={locale} className="min-h-screen bg-white text-neutral-900">
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/landing" aria-label="POS Stock Manager" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.webp" alt="POS Stock Manager" width={900} height={108} className="h-6 w-auto sm:h-8" />
          </Link>
          <nav className="ms-8 hidden items-center gap-6 text-sm text-neutral-600 lg:flex" aria-label="Principal">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-neutral-900">{l.label}</a>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            <LanguageMenu value={locale} onChange={changeLocale} label={c.lang.label} />
            <Link href="/" className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 md:block">
              {c.nav.open}
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
              aria-label={c.nav.menu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-neutral-200 bg-white px-4 py-2 lg:hidden">
            {[...navLinks, { href: '/admin', label: c.nav.backoffice }, { href: '/', label: c.nav.open }].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-brand-800 sm:text-5xl">{c.hero.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">{c.hero.text}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/" className={btnPrimary}>{c.hero.cta} <Arrow /></Link>
              <Link href="/admin" className={btnSecondary}>{c.hero.ctaSecondary}</Link>
            </div>
            <p className="mt-4 text-sm text-neutral-500">{c.hero.note}</p>
            <div className="mt-12">
              <Screenshot src={`/screens/pos-${shot}.webp`} alt={c.hero.alt} width={1600} height={958} priority />
            </div>
          </div>
        </section>

        {/* Écrans détaillés */}
        {sections.map((s, i) => (
          <section key={s.key} className={`${s.bg} border-b border-neutral-200 py-16 sm:py-20`}>
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="text-sm font-semibold text-blue-700">{s.data.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{s.data.title}</h2>
                <p className="mt-4 leading-relaxed text-neutral-600">{s.data.text}</p>
                <ul className="mt-6 space-y-3">
                  {s.data.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-neutral-800"><Tick />{p}</li>
                  ))}
                </ul>
              </div>
              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <Screenshot src={s.img} alt={s.data.alt} width={s.w} height={s.h} />
              </div>
            </div>
          </section>
        ))}

        {/* Fonctionnalités */}
        <section id="features" className="scroll-mt-16 border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-semibold text-blue-700">{c.features.eyebrow}</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{c.features.title}</h2>
            <dl className="mt-10 grid gap-x-10 sm:grid-cols-2">
              {c.features.items.map((f) => (
                <div key={f.title} className="border-t border-neutral-300 py-5">
                  <dt className="font-semibold text-brand-800">{f.title}</dt>
                  <dd className="mt-1 text-sm text-neutral-600">{f.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="how" className="scroll-mt-16 border-b border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm font-semibold text-blue-700">{c.how.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{c.how.title}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {c.how.steps.map((s, i) => (
                <li key={s.title} className="border-t-2 border-brand-600 pt-5">
                  <span className="text-sm font-semibold text-neutral-500">0{i + 1}</span>
                  <h3 className="mt-1 text-lg font-semibold text-brand-800">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Hors-ligne */}
        <section id="offline" className="scroll-mt-16 bg-brand-800 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-blue-300">{c.offline.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{c.offline.title}</h2>
              <p className="mt-4 leading-relaxed text-brand-300">{c.offline.text}</p>
            </div>
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {c.offline.points.map((p) => (
                <li key={p} className="flex items-start gap-3 py-4 text-sm text-brand-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-b border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <p className="text-sm font-semibold text-blue-700">{c.faq.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{c.faq.title}</h2>
            <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-brand-800 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-neutral-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel à l'action */}
        <section className="bg-neutral-50 py-16 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-800 sm:text-3xl">{c.cta.title}</h2>
              <p className="mt-2 text-neutral-600">{c.cta.text}</p>
            </div>
            <Link href="/" className={btnPrimary}>{c.cta.button} <Arrow /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-neutral-600 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.webp" alt="POS Stock Manager" width={720} height={720} loading="lazy" className="h-20 w-20 shrink-0" />
            <span className="max-w-xs">{c.footer.tagline}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-neutral-900">{c.footer.pos}</Link>
            <Link href="/admin" className="hover:text-neutral-900">{c.footer.admin}</Link>
            <span className="text-neutral-400">© {new Date().getFullYear()} · {c.footer.rights}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
