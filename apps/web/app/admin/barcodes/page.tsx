'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { generateInternalEan13 } from '../../../lib/print/code128';
import { BarcodeSvg } from '../../../components/admin/BarcodeSvg';
import { IconSearch } from '../../../components/icons';
import type { ProductDTO } from '@pos-dz/shared';

interface Preset {
  id: string;
  w: number; // mm
  h: number; // mm
  sheet?: boolean; // planche A4 : étiquettes en grille
}

const PRESETS: Preset[] = [
  { id: '58x40', w: 58, h: 40 },
  { id: '50x30', w: 50, h: 30 },
  { id: '40x25', w: 40, h: 25 },
  { id: 'a4', w: 63.5, h: 38.1, sheet: true }, // 21 étiquettes/page (3×7)
];

export default function BarcodesPage() {
  const { t, locale } = useTranslation();
  const { session } = useAdminAuth();
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [search, setSearch] = useState('');
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [presetId, setPresetId] = useState('50x30');
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [rotate, setRotate] = useState(false);
  // Calibrage fin selon l'imprimante (capteur d'espacement) : décalage vertical en mm, mémorisé sur ce poste.
  const [offsetY, setOffsetY] = useState(() => {
    try {
      return parseFloat(localStorage.getItem('labelOffsetY') ?? '0') || 0;
    } catch {
      return 0;
    }
  });
  function changeOffset(v: number) {
    const n = Math.max(-5, Math.min(5, Math.round(v * 10) / 10));
    setOffsetY(n);
    try {
      localStorage.setItem('labelOffsetY', String(n));
    } catch {
      /* stockage indisponible */
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preset = PRESETS.find((p) => p.id === presetId)!;

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const { products } = await adminFetch<{ products: ProductDTO[] }>(
        session.token,
        `/products${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      );
      setProducts(products.filter((p) => p.active));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    }
  }, [session, search]);

  useEffect(() => {
    load();
  }, [load]);

  /** Le code imprimé : code-barres si présent, sinon SKU (toujours scannable par la caisse). */
  const codeOf = (p: ProductDTO) => p.barcode || p.sku;

  async function generateFor(targets: ProductDTO[]) {
    if (!session || targets.length === 0) return;
    setBusy(true);
    try {
      const used = new Set(products.map((p) => p.barcode).filter(Boolean) as string[]);
      for (const p of targets) {
        const code = generateInternalEan13(used);
        used.add(code);
        await adminFetch(session.token, `/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ barcode: code }) });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setBusy(false);
    }
  }

  function setCopy(id: string, n: number) {
    setCopies((c) => {
      const next = { ...c };
      if (n > 0) next[id] = Math.min(n, 500);
      else delete next[id];
      return next;
    });
  }

  const selected = useMemo(() => products.filter((p) => copies[p.id] > 0), [products, copies]);
  const labels = useMemo(() => selected.flatMap((p) => Array.from({ length: copies[p.id] }, (_, i) => ({ p, key: `${p.id}-${i}` }))), [selected, copies]);
  const missing = products.filter((p) => !p.barcode);
  const selectedMissing = selected.filter((p) => !p.barcode);

  // Rotation : la page est tournée (h × w) et le contenu de l'étiquette pivoté de 90°.
  const rot = rotate && !preset.sheet;
  const pageW = rot ? preset.h : preset.w;
  const pageH = rot ? preset.w : preset.h;
  const pageCss = preset.sheet
    ? '@page { size: A4; margin: 10.7mm 7.2mm; }'
    : `@page { size: ${pageW}mm ${pageH}mm; margin: 0; }`;

  return (
    <div className="flex flex-col gap-4">
      <style>{pageCss}</style>

      <div className="no-print flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('barcodes.title')}</h1>
        <button
          onClick={() => window.print()}
          disabled={labels.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {t('barcodes.print')} ({labels.length})
        </button>
      </div>

      {error && <p className="no-print text-sm text-red-600">{error}</p>}

      <div className="no-print grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Sélection des produits */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('products.searchPlaceholder')}
                className="w-full rounded-lg border border-neutral-300 py-2 ps-9 pe-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
              />
            </div>
            <button
              onClick={() => setCopies(Object.fromEntries(products.map((p) => [p.id, 1])))}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {t('barcodes.selectAll')}
            </button>
            <button onClick={() => setCopies({})} className="text-sm font-medium text-neutral-600 hover:underline">
              {t('barcodes.clear')}
            </button>
            {missing.length > 0 && (
              <button
                disabled={busy}
                onClick={() => generateFor(missing)}
                className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
              >
                {t('barcodes.generateMissing', { count: String(missing.length) })}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-medium text-neutral-500">
                <tr>
                  <th className="px-4 py-3">{t('products.tableProduct')}</th>
                  <th className="px-4 py-3">{t('products.tableBarcode')}</th>
                  <th className="px-4 py-3">{t('products.tablePrice')}</th>
                  <th className="px-4 py-3">{t('barcodes.copies')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{p.name.fr}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
                      {p.barcode ? (
                        p.barcode
                      ) : (
                        <button disabled={busy} onClick={() => generateFor([p])} className="font-sans text-sm font-medium text-brand-600 hover:underline disabled:opacity-50">
                          {t('barcodes.generate')}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-900">{formatCurrency(p.sellingPriceCents, locale)}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={copies[p.id] ?? 0}
                        onChange={(e) => setCopy(p.id, parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                      {t('products.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Réglages d'étiquette */}
        <aside className="flex h-fit flex-col gap-4 rounded-xl bg-white shadow-card p-4 shadow-card">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            {t('barcodes.labelSize')}
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal">
              <option value="58x40">58 × 40 mm</option>
              <option value="50x30">50 × 30 mm</option>
              <option value="40x25">40 × 25 mm</option>
              <option value="a4">{t('barcodes.a4Sheet')}</option>
            </select>
          </label>
          {[
            [showName, setShowName, t('barcodes.showName')] as const,
            [showPrice, setShowPrice, t('barcodes.showPrice')] as const,
            [showCode, setShowCode, t('barcodes.showCode')] as const,
            [rotate, setRotate, t('barcodes.rotate')] as const,
          ].map(([val, set, label]) => (
            <label key={label} className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
          {!preset.sheet && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              {t('barcodes.offsetY')}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => changeOffset(offsetY - 0.5)} className="rounded-lg border border-neutral-300 px-3 py-1.5">−</button>
                <span className="w-16 text-center font-normal tabular-nums">{offsetY} mm</span>
                <button type="button" onClick={() => changeOffset(offsetY + 0.5)} className="rounded-lg border border-neutral-300 px-3 py-1.5">+</button>
              </div>
              <span className="text-xs font-normal text-neutral-400">{t('barcodes.offsetYHint')}</span>
            </label>
          )}
          {selectedMissing.length > 0 && (
            <p className="text-xs text-amber-700">{t('barcodes.usesSku', { count: String(selectedMissing.length) })}</p>
          )}
          <p className="text-xs text-neutral-400">{t('barcodes.hint')}</p>
        </aside>
      </div>

      {/* Aperçu = zone imprimée */}
      <section className="label-print-wrap">
        <h2 className="no-print mb-2 text-sm font-medium text-neutral-500">{t('barcodes.preview')}</h2>
        <div className={`label-print ${preset.sheet ? 'label-sheet' : 'label-roll'}`} style={preset.sheet ? { gridTemplateColumns: `repeat(3, ${preset.w}mm)` } : undefined}>
          {labels.map(({ p, key }) => (
            <div key={key} className="label-page" style={{ width: `${pageW}mm`, height: `${pageH - (preset.sheet ? 0 : 0.3)}mm` }}>
              <div
                className="label"
                style={
                  rot
                    ? { position: 'absolute', top: `${offsetY}mm`, left: `${pageW}mm`, width: `${preset.w}mm`, height: `${preset.h}mm`, transformOrigin: 'top left', transform: 'rotate(90deg)' }
                    : { position: 'relative', top: `${preset.sheet ? 0 : offsetY}mm`, width: `${preset.w}mm`, height: `${preset.h}mm` }
                }
              >
                {showName && <div className="label-name">{p.name.fr}</div>}
                <div className="label-bars">
                  <BarcodeSvg value={codeOf(p)} />
                </div>
                {showCode && <div className="label-code">{codeOf(p)}</div>}
                {showPrice && <div className="label-price">{formatCurrency(p.sellingPriceCents, locale)}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
