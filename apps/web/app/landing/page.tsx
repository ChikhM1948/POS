'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconBanknote, IconBarcode, IconBox, IconChart, IconLayers, IconReceipt, IconTruck, IconUsers, IconWallet } from '../../components/icons';
import { LANDING_LOCALES, landingContent, type LandingDict, type LandingLocale } from '../../lib/landing/content';

const STORAGE_KEY = 'landing-language';
/** Numéro WhatsApp au format international sans « + » (ex. 213555123456), fixé au build. */
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

// Archive du poste Windows publiée sur le serveur (npm run make:zip + publish:update) ; surchargeable.
const DOWNLOAD_URL = process.env.NEXT_PUBLIC_DOWNLOAD_URL
  ?? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/updates/POS-Algerie-Setup.zip`;

function waLink(text: string) {
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` : undefined;
}

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.95 9.95 0 1 0 12.04 2Zm0 18.1c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3.1.9.9-3-.2-.3a8.1 8.1 0 1 1 6.8 3.7Zm4.5-6.1c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.77.96-.14.17-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.02-.38.1-.5.11-.11.25-.28.37-.42.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.73 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.45-.6 1.65-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 rtl:rotate-180" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
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
        className="flex h-10 items-center gap-2 rounded-full bg-black/[0.05] px-3.5 text-sm font-semibold text-neutral-800 transition hover:bg-black/[0.09]"
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
        <ul role="listbox" aria-label={label} className="absolute end-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-[var(--radius-card)] border border-rule bg-surface p-1 shadow-[var(--shadow-pop)]">
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
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition hover:bg-black/[0.05] ${active ? 'font-semibold text-brand-800' : 'text-neutral-700'}`}
                >
                  <Flag code={l.code} className="h-6 w-6" />
                  <span className="flex-1 text-start">{l.name}</span>
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-600" aria-hidden="true">
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
    <figure className="overflow-hidden rounded-[var(--radius-card)] border border-rule bg-surface shadow-[var(--shadow-pop)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" className="block h-auto w-full" />
    </figure>
  );
}

const FEATURE_ICONS = [IconBox, IconLayers, IconBarcode, IconReceipt, IconChart, IconWallet, IconTruck, IconUsers, IconBanknote];
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface PublicReview { id: string; name: string; business: string; rating: number; comment: string }

function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={className} fill={n <= Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewsSection({ c }: { c: LandingDict['reviews'] }) {
  const [items, setItems] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState({ count: 0, average: 0 });
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/reviews`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setItems(d.items ?? []); setStats({ count: d.count ?? 0, average: d.average ?? 0 }); } })
      .catch(() => { /* section vide si l'API est injoignable */ });
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.get('name'), business: f.get('business'), comment: f.get('comment'), website: f.get('website'), rating }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setErrMsg(d?.error ?? '');
        setStatus('error');
        return;
      }
      form.reset();
      setRating(5);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  const field = 'mt-1.5 w-full rounded-xl border border-rule bg-surface px-4 py-3 text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-200';

  return (
    <section id="reviews" className="scroll-mt-16 bg-paper-2 py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{c.eyebrow}</p>
        <h2 className="mt-2 max-w-2xl font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.title}</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{c.text}</p>
        {stats.count > 0 && (
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink">
            <Stars value={stats.average} className="h-5 w-5" /> {stats.average.toFixed(1)} / 5 · {stats.count} {c.countLabel}
          </p>
        )}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {items.length === 0 && <p className="surface p-6 text-ink-2 sm:col-span-2">{c.empty}</p>}
            {items.map((r) => (
              <figure key={r.id} className="surface p-6">
                <Stars value={r.rating} />
                <span className="sr-only">{r.rating} {c.rate}</span>
                <blockquote className="mt-3 break-words text-sm leading-relaxed text-ink-2">« {r.comment} »</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-ink">
                  {r.name}
                  <span className="block font-normal text-muted">{r.business || c.anonymous}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <form onSubmit={submit} className="surface relative overflow-hidden p-6 sm:p-8" aria-label={c.formTitle}>
            <h3 className="font-display text-xl font-bold text-ink">{c.formTitle}</h3>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-ink">{c.ratingLabel}</legend>
              <div className="mt-2 flex gap-1" role="radiogroup" aria-label={c.ratingLabel}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${c.rate}`} onClick={() => setRating(n)} className="rounded p-1 text-amber-500 transition hover:scale-110">
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill={n <= rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm font-semibold text-ink">{c.name}
              <input name="name" required maxLength={60} autoComplete="name" className={field} />
            </label>
            <label className="mt-4 block text-sm font-semibold text-ink">{c.business}
              <input name="business" maxLength={80} className={field} />
            </label>
            <label className="mt-4 block text-sm font-semibold text-ink">{c.comment}
              <textarea name="comment" required minLength={10} maxLength={600} rows={4} className={field} />
              <span className="mt-1 block text-xs font-normal text-muted">{c.commentHint}</span>
            </label>
            {/* Piège anti-robots : invisible pour les humains */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <button type="submit" disabled={status === 'sending'} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-8 py-4 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
              {status === 'sending' ? c.sending : c.submit}
            </button>
            <p role="status" aria-live="polite" className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-brand-700'}`}>
              {status === 'done' && c.success}
              {status === 'error' && (errMsg || c.error)}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ i }: { i: number }) {
  const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
  return <Icon className="h-6 w-6 text-brand-600" />;
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
    { href: '#install', label: c.nav.install },
    { href: '#how', label: c.nav.how },
    { href: '#offline', label: c.nav.offline },
    { href: '#reviews', label: c.reviews.eyebrow },
    { href: '#faq', label: c.nav.faq },
  ];
  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-4 text-[15px] sm:px-8 sm:text-base font-semibold text-white transition hover:bg-brand-700';
  const btnSecondary = 'inline-flex items-center justify-center rounded-full border-2 border-brand-200 bg-surface px-4 py-4 text-[15px] sm:px-8 sm:text-base font-semibold text-ink transition hover:bg-brand-50';

  const sections = [
    { key: 'pos', data: c.showcase.pos, img: `/screens/pos-${shot}.webp`, w: 1600, h: 958, bg: 'bg-paper' },
    { key: 'stock', data: c.showcase.stock, img: `/screens/stock-${shot}.webp`, w: 1600, h: 1000, bg: 'bg-paper-2' },
    { key: 'reports', data: c.showcase.reports, img: `/screens/reports-${shot}.webp`, w: 1600, h: 1000, bg: 'bg-paper' },
  ] as const;

  return (
    <div dir={dir} lang={locale} className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-16">
          <Link href="/landing" aria-label="POS Stock Manager" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.webp" alt="POS Stock Manager" width={900} height={108} className="h-4 w-auto min-[400px]:h-5 sm:h-8" />
          </Link>
          <nav className="ms-8 hidden items-center gap-7 text-base font-semibold text-ink-2 xl:flex" aria-label="Principal">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="whitespace-nowrap transition hover:text-ink">{l.label}</a>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <LanguageMenu value={locale} onChange={changeLocale} label={c.lang.label} />
            <Link href="/" className="hidden whitespace-nowrap rounded-full bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-700 md:block">
              {c.nav.open}
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-ink-2 hover:bg-brand-100 xl:hidden"
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
          <div className="border-t border-rule px-4 py-2 xl:hidden">
            {[...navLinks, { href: '/admin', label: c.nav.backoffice }, { href: '/', label: c.nav.open }].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-brand-100">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main>
        {/* Hero : bande marine, le titre et ses actions à gauche, la vraie caisse en grand à droite */}
        <section className="panel-dark overflow-x-clip">
          <div className="mx-auto grid max-w-[1440px] items-center gap-x-14 gap-y-12 px-4 pb-20 pt-12 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-16 lg:py-16">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-5xl xl:text-6xl">{c.hero.title}</h1>
              <p className="mt-6 max-w-xl text-pretty text-xl leading-relaxed text-white/85 sm:text-2xl">{c.hero.text}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-signal-500 px-9 py-4 text-lg font-bold text-ink transition hover:bg-signal-400">{c.hero.cta} <Arrow /></Link>
                <Link href="/admin" className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10">{c.hero.ctaSecondary}</Link>
                <a href={DOWNLOAD_URL} download className="px-2 py-4 text-lg font-semibold text-white underline decoration-signal-400 decoration-2 underline-offset-4 transition hover:text-signal-300">{c.hero.download}</a>
              </div>
              <p className="mt-5 text-sm text-white/65">{c.hero.note}</p>
            </div>
            <div className="relative min-w-0 pb-4 pe-4">
              <div aria-hidden="true" className="absolute inset-y-6 start-6 end-0 rounded-[var(--radius-card)] bg-signal-500" />
              <div className="relative">
                <Screenshot src={`/screens/pos-${shot}.webp`} alt={c.hero.alt} width={1600} height={958} priority />
              </div>
            </div>
          </div>
        </section>

        {/* Écrans détaillés */}
        {sections.map((s, i) => (
          <section key={s.key} className={`${s.bg} py-20 sm:py-28`}>
            <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-16">
              <div className={`min-w-0 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{s.data.title}</h2>
                <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{s.data.text}</p>
                <ul className="mt-6 space-y-3">
                  {s.data.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-ink"><Tick />{p}</li>
                  ))}
                </ul>
              </div>
              <div className={`min-w-0 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                <Screenshot src={s.img} alt={s.data.alt} width={s.w} height={s.h} />
              </div>
            </div>
          </section>
        ))}

        {/* Installation */}
        <section id="install" className="scroll-mt-16 bg-paper-2 py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="max-w-2xl font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.install.title}</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{c.install.text}</p>
            <ol className="mt-12 grid gap-10 md:grid-cols-2">
              {c.install.steps.map((s, i) => (
                <li key={s.title} className="min-w-0">
                  <figure className="overflow-hidden rounded-[var(--radius-card)] border border-rule bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/install/step-${i + 1}.svg`} alt={s.alt} width={960} height={600} loading="lazy" decoding="async" className="block h-auto w-full" />
                  </figure>
                  <div className="mt-4 flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-500 text-sm font-bold text-ink">{i + 1}</span>
                    <div>
                      <h3 className="font-display text-[length:var(--text-title)] font-semibold text-ink">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.text}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="surface p-6">
                <p className="font-display font-semibold text-ink">{c.install.reqLabel}</p>
                <ul className="mt-3 space-y-2 text-sm text-ink-2">
                  {c.install.req.map((r) => (
                    <li key={r} className="flex items-start gap-2"><Tick />{r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-card)] border border-signal-500 bg-signal-300/20 p-6">
                <p className="font-display font-semibold text-ink">{c.install.warnTitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{c.install.warn}</p>
              </div>
            </div>
            <div className="mt-8">
              <a href={DOWNLOAD_URL} download className={btnPrimary}>{c.install.button} <Arrow /></a>
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="features" className="scroll-mt-16 bg-paper py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="max-w-2xl font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.features.title}</h2>
            <dl className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {c.features.items.map((f, idx) => (
                <div key={f.title} className="surface p-7 transition duration-200 motion-reduce:transition-none hover:shadow-lift">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100"><FeatureIcon i={idx} /></span>
                  <dt className="mt-4 font-display text-[length:var(--text-title)] font-semibold text-ink">{f.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{f.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Marque blanche */}
        <section id="whitelabel" className="scroll-mt-16 bg-paper-2 py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="max-w-2xl font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.whitelabel.title}</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{c.whitelabel.text}</p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.whitelabel.items.map((f) => (
                <li key={f.title} className="surface border-t-4 border-t-signal-500 p-6">
                  <h3 className="font-display text-[length:var(--text-title)] font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tarif */}
        <section id="pricing" className="scroll-mt-16 bg-paper py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="max-w-2xl font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.pricing.title}</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-rule bg-surface p-8">
                <p className="text-sm font-semibold text-muted">{c.pricing.trialLabel}</p>
                <p className="mt-2 font-display text-5xl font-bold tracking-[-0.03em] text-ink">{c.pricing.trialValue}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{c.pricing.trialText}</p>
              </div>
              <div className="panel-dark rounded-[var(--radius-card)] p-8">
                <p className="text-sm font-semibold text-white/70">{c.pricing.lifetimeLabel}</p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-display text-5xl font-bold tracking-[-0.03em] text-signal-400">
                  <bdi dir="ltr">{c.pricing.price}</bdi> <span className="text-lg">{c.pricing.currency}</span>
                  <span className="font-sans text-sm font-semibold text-white/70">{c.pricing.once}</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">{c.pricing.lifetimeText}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/90">
                  {c.pricing.points.map((p) => (
                    <li key={p} className="flex items-start gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-1 h-4 w-4 shrink-0 text-signal-400" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <a
                href={waLink(c.pricing.whatsappMessage) ?? '/'}
                target={WHATSAPP_NUMBER ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={btnPrimary}
              >
                {c.pricing.cta} <Arrow />
              </a>
            </div>
          </div>
        </section>

        {/* Comment ça marche : une vraie séquence */}
        <section id="how" className="scroll-mt-16 bg-paper-2 py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.how.title}</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {c.how.steps.map((s, i) => (
                <li key={s.title} className="border-t-2 border-brand-600 pt-5">
                  <span className="font-display text-3xl font-bold text-signal-500">{i + 1}</span>
                  <h3 className="mt-2 font-display text-[length:var(--text-title)] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Hors-ligne */}
        <section id="offline" className="panel-dark scroll-mt-16 py-20 sm:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-16">
            <div className="min-w-0">
              <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-white">{c.offline.title}</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">{c.offline.text}</p>
            </div>
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {c.offline.points.map((p) => (
                <li key={p} className="flex items-start gap-3 py-4 text-sm text-white/90">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ReviewsSection c={c.reviews} />

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 bg-paper py-20 sm:py-28">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-16">
            <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.faq.title}</h2>
            <div className="mt-10 max-w-5xl divide-y divide-rule border-y border-rule">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-16 bg-paper-2 py-20 sm:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-16">
            <div className="min-w-0">
              <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">{c.contact.title}</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{c.contact.text}</p>
              <div className="mt-6">
                {WHATSAPP_NUMBER ? (
                  <a href={waLink(c.contact.message)} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                    <WhatsAppIcon /> {c.contact.button}
                  </a>
                ) : (
                  <p className="text-sm text-muted">{c.contact.unavailable}</p>
                )}
              </div>
            </div>
            <dl className="surface divide-y divide-rule px-6 text-sm">
              <div className="py-4">
                <dt className="font-display font-semibold text-ink">{c.contact.hoursLabel}</dt>
                <dd className="mt-1 text-ink-2">{c.contact.hours}</dd>
              </div>
              <div className="py-4">
                <dt className="font-display font-semibold text-ink">{c.contact.replyLabel}</dt>
                <dd className="mt-1 text-ink-2">{c.contact.reply}</dd>
              </div>
              <div className="py-4">
                <dt className="font-display font-semibold text-ink">{c.contact.helpLabel}</dt>
                <dd className="mt-2">
                  <ul className="space-y-2 text-ink-2">
                    {c.contact.help.map((h) => (
                      <li key={h} className="flex items-start gap-2"><Tick />{h}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Appel à l'action */}
        <section className="bg-paper px-4 py-20 sm:px-6 sm:py-28 lg:px-16">
          <div className="panel-dark mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 rounded-[var(--radius-card)] p-8 sm:p-16 md:flex-row md:items-center lg:py-24">
            <div className="min-w-0">
              <h2 className="font-display text-[length:var(--text-section)] font-bold leading-[1.05] tracking-[-0.025em] text-white">{c.cta.title}</h2>
              <p className="mt-3 max-w-xl text-white/75">{c.cta.text}</p>
            </div>
            <Link href="/" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-signal-500 px-9 py-4 text-lg font-bold text-ink transition hover:bg-signal-400">{c.cta.button} <Arrow /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule bg-paper">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-8 text-sm text-ink-2 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-16">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.webp" alt="POS Stock Manager" width={720} height={720} loading="lazy" className="h-20 w-20 shrink-0" />
            <span className="max-w-xs">{c.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="hover:text-ink">{c.footer.pos}</Link>
            <Link href="/admin" className="hover:text-ink">{c.footer.admin}</Link>
            {WHATSAPP_NUMBER && (
              <a href={waLink(c.contact.message)} target="_blank" rel="noopener noreferrer" className="hover:text-ink">{c.footer.contact}</a>
            )}
            <span className="text-muted">© {new Date().getFullYear()} {c.footer.rights} Developed by DevLab</span>
          </div>
        </div>
      </footer>

      {WHATSAPP_NUMBER && (
        <a
          href={waLink(c.contact.message)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={c.contact.floating}
          title={c.contact.floating}
          className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[var(--shadow-pop)] transition hover:scale-105"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
