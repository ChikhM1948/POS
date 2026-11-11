'use client';

import { LicenseGate } from '../components/LicenseGate';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDeviceId } from '../hooks/useDeviceId';
import { getOfflineDB, type HeldCart, type LocalProduct } from '../lib/db/offline-db';
import { SyncEngine } from '../lib/sync/sync-engine';
import { LOCAL_MODE } from '../lib/localMode';
import { LoginForm, type Session } from '../components/pos/LoginForm';
import { OfflineBanner } from '../components/pos/OfflineBanner';
import { SaleCheckout, type SaleCheckoutHandle } from '../components/pos/SaleCheckout';
import { HeldCartsModal } from '../components/pos/HeldCartsModal';
import { daysUntilExpiry, EXPIRY_WARNING_DAYS } from '../lib/expiry';
import { WeightModal } from '../components/pos/WeightModal';
import { effectivePriceCents, isPromoActive, lineTotalCents, parseScaleBarcode, roundQty } from '../lib/pricing';
import { DiscountEditor } from '../components/pos/DiscountEditor';
import { Receipt, type CompletedSale } from '../components/pos/Receipt';
import { BrandMark } from '../components/BrandMark';
import { clearSession, loadSession, saveSession } from '../lib/session';
import { useBranding, useLoadBranding } from '../lib/branding';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTranslation } from '../lib/i18n/LanguageContext';
import { formatCurrency } from '../lib/format';
import { IconBarcode, IconCart, IconImageOff, IconLogout, IconMinus, IconPlus, IconTrash } from '../components/icons';
import type { SaleLine } from '@pos-dz/shared';

// Valeurs internes fixes (pas des libellés affichés) : ALL_CATEGORIES sert de sentinelle pour "pas
// de filtre" et UNCATEGORIZED regroupe les produits sans catégorie — voir t('pos.categoryAll'/'pos.categoryOther')
// pour leur affichage traduit.
const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = '__uncategorized__';

export default function PosPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const deviceId = useDeviceId();
  const [session, setSessionState] = useState<Session | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    if (LOCAL_MODE) return; // le poste bureau garde sa connexion PIN à chaque prise de service
    if (s) saveSession(s);
    else clearSession();
  }, []);
  // Reprend la session du caissier après rechargement (utile hors-ligne, où la reconnexion est impossible).
  useEffect(() => {
    if (!LOCAL_MODE) setSessionState(loadSession());
    setSessionRestored(true);
  }, []);
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [lastSale, setLastSale] = useState<CompletedSale | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<SaleCheckoutHandle>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [discountTrigger, setDiscountTrigger] = useState({ productId: '', n: 0 });
  const [showHeld, setShowHeld] = useState(false);
  const [weighTarget, setWeighTarget] = useState<{ product: LocalProduct; replace: boolean } | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useLoadBranding(session?.token);
  const { branding } = useBranding();
  const tenantBranding = useMemo(
    () => ({ nameFr: branding.name || 'Épicerie Demo', logoUrl: branding.logoUrl, footer: t('pos.demoFooter') }),
    [branding.name, branding.logoUrl, t],
  );

  const db = useMemo(() => (deviceId ? getOfflineDB(deviceId) : null), [deviceId]);

  useEffect(() => {
    if (!db || !deviceId || !session || !(session.syncEnabled || LOCAL_MODE)) return;
    const engine = new SyncEngine(db, session.tenantId, deviceId, session.token);
    engine.start();
    return () => engine.stop();
  }, [db, deviceId, session]);

  const heldCount = useLiveQuery(() => (db ? db.heldCarts.count() : Promise.resolve(0)), [db]) ?? 0;
  const products = useLiveQuery(() => (db ? db.products.toArray() : Promise.resolve<LocalProduct[]>([])), [db]) ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category?.trim() || UNCATEGORIZED);
    return [ALL_CATEGORIES, ...Array.from(set).sort((a, b) => a.localeCompare(b, locale))];
  }, [products]);

  // Douchette code-barres (émulation clavier) : les chiffres sont lus via `event.code` (touche physique)
  // car sur un clavier AZERTY/arabe `event.key` donne « &é"' » ou des lettres arabes ; et si le
  // champ a perdu le focus (clic sur un produit, fermeture d'un modal) la saisie est redirigée vers lui.
  useEffect(() => {
    if (!session) return;
    function onKeyDown(e: KeyboardEvent) {
      const input = scanInputRef.current;
      if (!input || e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const typingElsewhere = target && target !== input && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (typingElsewhere || document.querySelector('.fixed.inset-0.z-50')) return;
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code)?.[1];
      if (!digit && !(e.key.length === 1 && target !== input)) return;
      if (digit) {
        e.preventDefault();
        input.focus();
        setQuery((q) => q + digit);
      } else {
        input.focus(); // la touche est alors tapée normalement dans le champ
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const category = p.category?.trim() || UNCATEGORIZED;
      if (selectedCategory !== ALL_CATEGORIES && category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.nameFr.toLowerCase().includes(q) ||
        (p.nameAr ?? '').includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q)
      );
    });
  }, [products, selectedCategory, query]);

  function flash(message: string) {
    setScanFeedback(message);
    setTimeout(() => setScanFeedback(null), 3500);
  }

  function addToCart(product: LocalProduct, weightQty?: number) {
    // Produit au poids : on demande la pesée (sauf si le code-barres balance l'a déjà donnée).
    if (product.soldByWeight && weightQty === undefined) {
      setWeighTarget({ product, replace: false });
      return;
    }
    const addQty = weightQty ?? 1;
    const unitPriceCents = effectivePriceCents(product);
    setSelectedLineId(product.id);
    if (product.nearestExpiry && daysUntilExpiry(product.nearestExpiry) < 0) {
      flash(t('expiry.expiredWarning', { name: product.nameFr }));
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => {
          if (l.productId !== product.id) return l;
          const quantity = roundQty(l.quantity + addQty);
          return { ...l, quantity, lineTotalCents: lineTotalCents(l.unitPriceCents, quantity, l.discountCents) };
        });
      }
      const line: SaleLine = {
        productId: product.id,
        name: { fr: product.nameFr, ar: product.nameAr },
        quantity: addQty,
        unitPriceCents,
        costPriceCents: product.costPriceCents,
        taxRate: product.taxRate,
        discountCents: 0,
        lineTotalCents: lineTotalCents(unitPriceCents, addQty, 0),
      };
      return [...prev, line];
    });
  }

  /** Remplace la quantité (pesée) d'une ligne au poids. */
  function setLineQuantity(product: LocalProduct, quantity: number) {
    setCart((prev) => prev.map((l) => (l.productId === product.id ? { ...l, quantity, lineTotalCents: lineTotalCents(l.unitPriceCents, quantity, l.discountCents) } : l)));
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: l.quantity + delta, lineTotalCents: lineTotalCents(l.unitPriceCents, l.quantity + delta, l.discountCents) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function applyDiscount(productId: string, discountCents: number) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, discountCents, lineTotalCents: lineTotalCents(l.unitPriceCents, l.quantity, discountCents) } : l)),
    );
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    const scale = parseScaleBarcode(value, products);
    if (scale) {
      addToCart(scale.product, scale.quantity);
      setQuery('');
      setScanFeedback(null);
      scanInputRef.current?.focus();
      return;
    }
    const match = products.find((p) => p.barcode === value || p.sku.toLowerCase() === value.toLowerCase());
    if (match) {
      addToCart(match);
      setQuery('');
      setScanFeedback(null);
    } else {
      setScanFeedback(t('pos.noProductFound', { value }));
      setTimeout(() => setScanFeedback(null), 2000);
    }
    scanInputRef.current?.focus();
  }

  /** Suspend la vente en cours (le client va chercher un autre article) : persistée localement, reprise à tout moment. */
  const holdCurrentCart = useCallback(async () => {
    if (!db || cart.length === 0) return;
    await db.heldCarts.add({ lines: cart, heldAt: new Date().toISOString() });
    setCart([]);
    setQuery('');
    scanInputRef.current?.focus();
  }, [db, cart]);

  async function resumeCart(held: HeldCart) {
    if (!db) return;
    // Un panier déjà en cours n'est jamais perdu : il passe lui-même en attente (échange).
    const current = cart;
    await db.transaction('rw', db.heldCarts, async () => {
      await db.heldCarts.delete(held.id!);
      if (current.length > 0) await db.heldCarts.add({ lines: current, heldAt: new Date().toISOString() });
    });
    if (current.length > 0) flash(t('hold.swapped'));
    setCart(held.lines);
    setSelectedLineId(held.lines[held.lines.length - 1]?.productId ?? null);
    setShowHeld(false);
    scanInputRef.current?.focus();
  }

  const activeLineId = cart.some((l) => l.productId === selectedLineId) ? selectedLineId : cart[cart.length - 1]?.productId ?? null;

  // Mode clavier : F1 scan · F2 espèces · F3 CIB · F4 crédit · F5 attente · F6 paniers en attente ·
  // F7 remise · F8 vider · ↑/↓ ligne · +/− quantité · Suppr retirer (champ de saisie vide).
  // Ignoré quand un modal est ouvert (chacun gère ses propres touches).
  useEffect(() => {
    if (!session) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey || document.querySelector('.fixed.inset-0.z-50')) return;
      const input = scanInputRef.current;
      const target = e.target as HTMLElement | null;
      const typingElsewhere = !!target && target !== input && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

      const fKey: Record<string, () => void> = {
        F1: () => input?.focus(),
        F2: () => checkoutRef.current?.payCash(),
        F3: () => checkoutRef.current?.payCib(),
        F4: () => checkoutRef.current?.payCredit(),
        F5: () => void holdCurrentCart(),
        F6: () => setShowHeld(true),
        F7: () => activeLineId && setDiscountTrigger((d) => ({ productId: activeLineId, n: d.n + 1 })),
        F8: () => setCart([]),
      };
      if (fKey[e.key]) {
        if (typingElsewhere && e.key !== 'F1') return;
        e.preventDefault();
        fKey[e.key]();
        return;
      }

      if (typingElsewhere || (input && input.value !== '')) return; // le champ de scan sert d'abord à saisir
      if (cart.length === 0 || !activeLineId) return;
      const i = cart.findIndex((l) => l.productId === activeLineId);
      if (e.key === 'ArrowDown') setSelectedLineId(cart[Math.min(i + 1, cart.length - 1)].productId);
      else if (e.key === 'ArrowUp') setSelectedLineId(cart[Math.max(i - 1, 0)].productId);
      else if (e.key === '+' || e.key === 'Add') changeQuantity(activeLineId, 1);
      else if (e.key === '-' || e.key === 'Subtract') changeQuantity(activeLineId, -1);
      else if (e.key === 'Delete') removeLine(activeLineId);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, cart, activeLineId, holdCurrentCart]);

  function handleSaleComplete(sale: CompletedSale) {
    setLastSale(sale);
    setCart([]);
    setQuery('');
  }

  if (!sessionRestored) return null;

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <OfflineBanner localMode={LOCAL_MODE || !session.syncEnabled} />
      <LicenseGate token={session.token} canActivate={false} />
      <header className="glass relative z-10 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <BrandMark size={38} />
          <div>
            <h1 className="text-sm font-semibold leading-tight text-neutral-900">{t('pos.title')}</h1>
            <p className="text-xs text-neutral-500">{session.cashierName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeld(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            {t('hold.title')}
            {heldCount > 0 && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800">{heldCount}</span>}
            <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">F6</kbd>
          </button>
          <LanguageSwitcher />
          <a
            href="/admin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            {t('pos.backoffice')}
          </a>
          <button
            onClick={() => setSession(null)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <IconLogout className="h-4 w-4" />
            {t('pos.logout')}
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_400px]">
        <section className="flex flex-col overflow-hidden">
          <div className="glass relative z-[1] flex flex-col gap-3 px-6 py-4">
            <form onSubmit={handleScanSubmit} className="relative">
              <IconBarcode className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <input
                ref={scanInputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('pos.searchPlaceholder')}
                className="w-full rounded-xl border border-transparent bg-black/[0.05] py-3 ps-12 pe-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/40 focus:bg-white"
              />
            </form>
            {scanFeedback && <p className="text-sm font-medium text-red-600">{scanFeedback}</p>}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-card'
                      : 'bg-black/[0.05] text-neutral-600 hover:bg-black/[0.08]'
                  }`}
                >
                  {cat === ALL_CATEGORIES ? t('pos.categoryAll') : cat === UNCATEGORIZED ? t('pos.categoryOther') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white text-start shadow-card transition duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:translate-y-0"
                >
                  <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-neutral-100">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover transition duration-150 " />
                    ) : (
                      <IconImageOff className="h-8 w-8 text-neutral-300" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    {product.category && (
                      <span className="w-fit text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        {product.category}
                      </span>
                    )}
                    <p className="text-sm font-medium leading-tight text-neutral-900">{product.nameFr}</p>
                    {product.nameAr && (
                      <p dir="rtl" className="text-sm text-neutral-500">
                        {product.nameAr}
                      </p>
                    )}
                    <ExpiryBadge nearestExpiry={product.nearestExpiry} />
                    <p className="mt-auto flex items-baseline gap-2 pt-1 text-base font-semibold tabular-nums text-neutral-900">
                      {formatDZD(effectivePriceCents(product))}
                      {product.soldByWeight && <span className="text-xs font-normal text-neutral-500">/ {product.unit}</span>}
                      {isPromoActive(product) && (
                        <>
                          <span className="text-xs font-normal text-neutral-400 line-through">{formatDZD(product.sellingPriceCents)}</span>
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">{t('pos.promoBadge')}</span>
                        </>
                      )}
                    </p>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
                  {products.length === 0 ? t('pos.noProductsSynced') : t('pos.noSearchResults')}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden border-s border-black/[0.08] bg-white">
          <h2 className="flex items-center gap-2 border-b border-black/[0.06] bg-white px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <IconCart className="h-4 w-4" />
            {t('pos.cart.title')}
            {cart.length > 0 && (
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-700">
                {cart.reduce((sum, l) => sum + l.quantity, 0)}
              </span>
            )}
            {cart.length > 0 && (
              <div className="ms-auto flex items-center gap-1">
                <button
                  onClick={() => void holdCurrentCart()}
                  className="rounded-md px-2 py-1 text-xs font-medium normal-case tracking-normal text-neutral-500 transition hover:bg-amber-50 hover:text-amber-700"
                >
                  {t('hold.button')} <kbd className="ms-1 rounded bg-neutral-100 px-1 text-[10px]">F5</kbd>
                </button>
                <button
                  onClick={() => setCart([])}
                  className="rounded-md px-2 py-1 text-xs font-medium normal-case tracking-normal text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  {t('pos.cart.clear')} <kbd className="ms-1 rounded bg-neutral-100 px-1 text-[10px]">F8</kbd>
                </button>
              </div>
            )}
          </h2>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <IconCart className="h-8 w-8 text-neutral-300" />
                <p className="max-w-[16rem] text-sm text-neutral-400">{t('pos.cart.empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {cart.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  return (
                  <li
                    key={`${line.productId}-${line.variantSku ?? ''}`}
                    onClick={() => setSelectedLineId(line.productId)}
                    className={`relative flex items-center gap-3 px-4 py-3 ${line.productId === activeLineId ? 'bg-brand-50/60 shadow-[inset_3px_0_0_0] shadow-brand-500' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{line.name.fr}</p>
                      <p className="text-xs text-neutral-500">
                        {formatDZD(line.unitPriceCents)} {t('pos.cart.perUnit')}
                      </p>
                      <DiscountEditor
                        quantity={line.quantity}
                        unitPriceCents={line.unitPriceCents}
                        minSellingPriceCents={product?.minSellingPriceCents}
                        discountCents={line.discountCents}
                        onApply={(discountCents) => applyDiscount(line.productId, discountCents)}
                        openSignal={discountTrigger.productId === line.productId ? discountTrigger.n : 0}
                      />
                    </div>
                    {product?.soldByWeight ? (
                      <button
                        onClick={() => setWeighTarget({ product, replace: true })}
                        className="rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold tabular-nums text-neutral-900 transition hover:bg-neutral-100"
                      >
                        {line.quantity.toFixed(3)} {product.unit}
                      </button>
                    ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeQuantity(line.productId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100"
                        aria-label={t('pos.cart.decrease')}
                      >
                        <IconMinus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums text-neutral-900">{line.quantity}</span>
                      <button
                        onClick={() => changeQuantity(line.productId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100"
                        aria-label={t('pos.cart.increase')}
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    )}
                    <span className="w-24 shrink-0 text-end text-sm font-semibold tabular-nums text-neutral-900">{formatDZD(line.lineTotalCents)}</span>
                    <button
                      onClick={() => removeLine(line.productId)}
                      className="rounded-md p-1 text-neutral-300 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={t('pos.cart.remove')}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          <SaleCheckout
            ref={checkoutRef}
            deviceId={deviceId!}
            storeId={session.storeId}
            storeCode="ALG01"
            registerId="R1"
            cashierId={session.cashierId}
            cartLines={cart}
            tenantBranding={tenantBranding}
            onSaleComplete={handleSaleComplete}
          />
        </section>
      </main>

      {showLegend && (
        <footer className="glass flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-1.5 text-xs text-neutral-500">
          {([
            ['F1', 'shortcuts.scan'], ['F2', 'shortcuts.cash'], ['F3', 'shortcuts.cib'], ['F4', 'shortcuts.credit'],
            ['F5', 'shortcuts.hold'], ['F6', 'shortcuts.recall'], ['F7', 'shortcuts.discount'], ['F8', 'shortcuts.clear'],
            ['↑↓', 'shortcuts.select'], ['+ −', 'shortcuts.qty'], ['Suppr', 'shortcuts.remove'],
          ] as const).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-semibold text-neutral-700">{key}</kbd>
              {t(label)}
            </span>
          ))}
          <span className="ms-auto text-neutral-400">Developed by DevLab</span>
          <button onClick={() => setShowLegend(false)} className=" text-neutral-400 hover:text-neutral-700" aria-label={t('shortcuts.toggle')}>
            ×
          </button>
        </footer>
      )}
      {!showLegend && (
        <span className="absolute bottom-2 start-3 text-xs text-neutral-400">Developed by DevLab</span>
      )}
      {!showLegend && (
        <button onClick={() => setShowLegend(true)} className="absolute bottom-2 end-2 rounded-md bg-white px-2 py-1 text-xs text-neutral-500 shadow-sm ring-1 ring-neutral-200 hover:text-neutral-800">
          {t('shortcuts.title')}
        </button>
      )}

      {showHeld && db && (
        <HeldCartsModal
          db={db}
          onResume={(c) => void resumeCart(c)}
          onClose={() => {
            setShowHeld(false);
            scanInputRef.current?.focus();
          }}
        />
      )}

      {weighTarget && (
        <WeightModal
          name={weighTarget.product.nameFr}
          unit={weighTarget.product.unit}
          unitPriceCents={effectivePriceCents(weighTarget.product)}
          initialQuantity={weighTarget.replace ? cart.find((l) => l.productId === weighTarget.product.id)?.quantity : undefined}
          onCancel={() => {
            setWeighTarget(null);
            scanInputRef.current?.focus();
          }}
          onConfirm={(quantity) => {
            const { product, replace } = weighTarget;
            setWeighTarget(null);
            if (replace) setLineQuantity(product, quantity);
            else addToCart(product, quantity);
            scanInputRef.current?.focus();
          }}
        />
      )}

      {lastSale && (
        <Receipt
          sale={lastSale}
          tenantBranding={tenantBranding}
          onClose={() => {
            setLastSale(null);
            scanInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}

/** Pastille de péremption d'un produit : rouge si un lot périmé est encore en stock, ambre s'il expire bientôt. */
function ExpiryBadge({ nearestExpiry }: { nearestExpiry?: string }) {
  const { t } = useTranslation();
  if (!nearestExpiry) return null;
  const days = daysUntilExpiry(nearestExpiry);
  if (days > EXPIRY_WARNING_DAYS) return null;
  const expired = days < 0;
  return (
    <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
      {expired ? t('expiry.expired') : t('expiry.daysLeft', { n: days })}
    </span>
  );
}
