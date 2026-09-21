'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDeviceId } from '../hooks/useDeviceId';
import { getOfflineDB, type LocalProduct } from '../lib/db/offline-db';
import { SyncEngine } from '../lib/sync/sync-engine';
import { LoginForm, type Session } from '../components/pos/LoginForm';
import { OfflineBanner } from '../components/pos/OfflineBanner';
import { SaleCheckout } from '../components/pos/SaleCheckout';
import { Receipt, type CompletedSale } from '../components/pos/Receipt';
import { BrandMark } from '../components/BrandMark';
import { IconBarcode, IconCart, IconImageOff, IconLogout, IconMinus, IconPlus, IconTrash } from '../components/icons';
import type { SaleLine } from '@pos-dz/shared';

const formatDZD = (cents: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

const ALL_CATEGORIES = 'Tous';
const UNCATEGORIZED = 'Autres';

export default function PosPage() {
  const deviceId = useDeviceId();
  const [session, setSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [lastSale, setLastSale] = useState<CompletedSale | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const db = useMemo(() => (deviceId ? getOfflineDB(deviceId) : null), [deviceId]);

  useEffect(() => {
    if (!db || !deviceId || !session) return;
    const engine = new SyncEngine(db, session.tenantId, deviceId, session.token);
    engine.start();
    return () => engine.stop();
  }, [db, deviceId, session]);

  const products = useLiveQuery(() => (db ? db.products.toArray() : Promise.resolve<LocalProduct[]>([])), [db]) ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category?.trim() || UNCATEGORIZED);
    return [ALL_CATEGORIES, ...Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [products]);

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

  function addToCart(product: LocalProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + 1, lineTotalCents: l.unitPriceCents * (l.quantity + 1) - l.discountCents }
            : l,
        );
      }
      const line: SaleLine = {
        productId: product.id,
        name: { fr: product.nameFr, ar: product.nameAr },
        quantity: 1,
        unitPriceCents: product.sellingPriceCents,
        taxRate: product.taxRate,
        discountCents: 0,
        lineTotalCents: product.sellingPriceCents,
      };
      return [...prev, line];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: l.quantity + delta, lineTotalCents: l.unitPriceCents * (l.quantity + delta) - l.discountCents }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    const match = products.find((p) => p.barcode === value || p.sku.toLowerCase() === value.toLowerCase());
    if (match) {
      addToCart(match);
      setQuery('');
      setScanFeedback(null);
    } else {
      setScanFeedback(`Aucun produit pour « ${value} »`);
      setTimeout(() => setScanFeedback(null), 2000);
    }
    scanInputRef.current?.focus();
  }

  function handleSaleComplete(sale: CompletedSale) {
    setLastSale(sale);
    setCart([]);
    setQuery('');
  }

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100">
      <OfflineBanner />
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <BrandMark size={38} />
          <div>
            <h1 className="text-base font-bold leading-tight text-neutral-900">Caisse</h1>
            <p className="text-xs text-neutral-500">{session.cashierName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            Back-office
          </a>
          <button
            onClick={() => setSession(null)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <IconLogout className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_400px]">
        <section className="flex flex-col overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-neutral-200 bg-white px-6 py-4">
            <form onSubmit={handleScanSubmit} className="relative">
              <IconBarcode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <input
                ref={scanInputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scanner un code-barres ou rechercher un produit…"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-3.5 pl-12 pr-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white"
              />
            </form>
            {scanFeedback && <p className="text-sm font-medium text-red-600">{scanFeedback}</p>}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-card'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}
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
                  className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-card transition duration-150 hover:-translate-y-1 hover:border-brand-300 hover:shadow-popover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.97]"
                >
                  <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-neutral-100">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" />
                    ) : (
                      <IconImageOff className="h-8 w-8 text-neutral-300" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    {product.category && (
                      <span className="w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                        {product.category}
                      </span>
                    )}
                    <p className="font-semibold leading-tight text-neutral-900">{product.nameFr}</p>
                    {product.nameAr && (
                      <p dir="rtl" className="text-sm text-neutral-500">
                        {product.nameAr}
                      </p>
                    )}
                    <p className="mt-auto pt-1 text-lg font-bold text-brand-700">{formatDZD(product.sellingPriceCents)}</p>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
                  {products.length === 0
                    ? "Aucun produit synchronisé. Vérifiez que l'API est démarrée et que le seed a été exécuté."
                    : 'Aucun produit ne correspond à cette recherche.'}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden border-l border-neutral-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <IconCart className="h-4 w-4" />
            Panier
            {cart.length > 0 && (
              <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {cart.reduce((sum, l) => sum + l.quantity, 0)}
              </span>
            )}
          </h2>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {cart.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-400">Le panier est vide — sélectionnez un produit ou scannez un code-barres.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {cart.map((line) => (
                  <li key={`${line.productId}-${line.variantSku ?? ''}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{line.name.fr}</p>
                      <p className="text-xs text-neutral-500">{formatDZD(line.unitPriceCents)} / unité</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeQuantity(line.productId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                        aria-label="Diminuer"
                      >
                        <IconMinus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums text-neutral-900">{line.quantity}</span>
                      <button
                        onClick={() => changeQuantity(line.productId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                        aria-label="Augmenter"
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-neutral-900">{formatDZD(line.lineTotalCents)}</span>
                    <button
                      onClick={() => removeLine(line.productId)}
                      className="text-neutral-300 transition hover:text-red-600"
                      aria-label="Retirer"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SaleCheckout
            deviceId={deviceId!}
            storeId={session.storeId}
            storeCode="ALG01"
            registerId="R1"
            cashierId={session.cashierId}
            cartLines={cart}
            tenantBranding={{ nameFr: 'Épicerie Demo', footer: 'Merci de votre visite !' }}
            onSaleComplete={handleSaleComplete}
          />
        </section>
      </main>

      {lastSale && (
        <Receipt
          sale={lastSale}
          tenantBranding={{ nameFr: 'Épicerie Demo', footer: 'Merci de votre visite !' }}
          onClose={() => {
            setLastSale(null);
            scanInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
