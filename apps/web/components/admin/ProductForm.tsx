'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import type { ProductDTO, ProductInput, TaxRate } from '@pos-dz/shared';

const centsToInput = (cents?: number) => (cents !== undefined ? (cents / 100).toFixed(2) : '0.00');
const inputToCents = (value: string) => Math.round(parseFloat(value.replace(',', '.') || '0') * 100);
const marginPercent = (sellingPriceCents: number, costPriceCents: number) =>
  sellingPriceCents > 0 ? Math.round(((sellingPriceCents - costPriceCents) / sellingPriceCents) * 1000) / 10 : 0;

const MAX_IMAGE_DIMENSION = 480;

/** Redimensionne côté client avant stockage (data URL) — évite des documents produit trop lourds. */
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Rendu image indisponible.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface Props {
  initial?: ProductDTO | null;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
  /** false pour un caissier sans la permission "voir le prix d'achat" — masque le coût et la marge. */
  canViewCostPrice?: boolean;
}

/** Formulaire création/édition — les montants sont saisis en DZD et convertis en centimes à la soumission. */
export function ProductForm({ initial, onSubmit, onCancel, canViewCostPrice = true }: Props) {
  const { t } = useTranslation();
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [nameFr, setNameFr] = useState(initial?.name.fr ?? '');
  const [nameAr, setNameAr] = useState(initial?.name.ar ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imageError, setImageError] = useState<string | null>(null);
  const [unit, setUnit] = useState(initial?.unit ?? 'unité');
  const [priceInput, setPriceInput] = useState(centsToInput(initial?.sellingPriceCents));
  const [costPriceInput, setCostPriceInput] = useState(centsToInput(initial?.costPriceCents));
  const [minSellingPriceInput, setMinSellingPriceInput] = useState(
    initial?.minSellingPriceCents !== undefined ? centsToInput(initial.minSellingPriceCents) : '',
  );
  const [taxRate, setTaxRate] = useState<TaxRate>(initial?.taxRate ?? 19);
  const [isPerishable, setIsPerishable] = useState(initial?.isPerishable ?? false);
  const [threshold, setThreshold] = useState(initial?.lowStockThreshold?.toString() ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        name: { fr: nameFr.trim(), ar: nameAr.trim() || undefined },
        category: category.trim() || undefined,
        imageUrl: imageUrl || undefined,
        unit: unit.trim() || 'unité',
        variants: initial?.variants ?? [],
        sellingPriceCents: inputToCents(priceInput),
        costPriceCents: inputToCents(costPriceInput),
        minSellingPriceCents: minSellingPriceInput ? inputToCents(minSellingPriceInput) : undefined,
        taxRate,
        isPerishable,
        lowStockThreshold: threshold ? parseInt(threshold, 10) : undefined,
        active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productForm.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t('productForm.errorImageType'));
      return;
    }
    try {
      setImageError(null);
      setImageUrl(await resizeImageToDataUrl(file));
    } catch {
      setImageError(t('productForm.errorImageLoad'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h3 className="text-base font-semibold text-neutral-900">{initial ? t('productForm.titleEdit') : t('productForm.titleNew')}</h3>

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-neutral-400">{t('productForm.photoPlaceholder')}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="w-fit cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
            {imageUrl ? t('productForm.changeImage') : t('productForm.addImage')}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl('')} className="text-start text-xs font-medium text-red-600 hover:underline">
              {t('productForm.removeImage')}
            </button>
          )}
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.sku')}
          <input value={sku} onChange={(e) => setSku(e.target.value)} required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.barcode')}
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.nameFr')}
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.nameAr')}
          <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.category')}
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.unit')}
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.price')}
          <input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} inputMode="decimal" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
          {canViewCostPrice && inputToCents(priceInput) > 0 && (
            <span className="text-xs text-neutral-500">
              {t('productForm.marginHint', { percent: marginPercent(inputToCents(priceInput), inputToCents(costPriceInput)) })}
            </span>
          )}
        </label>
        {canViewCostPrice && (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('productForm.costPrice')}
            <input
              value={costPriceInput}
              onChange={(e) => setCostPriceInput(e.target.value)}
              inputMode="decimal"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.minSellingPrice')}
          <input
            value={minSellingPriceInput}
            onChange={(e) => setMinSellingPriceInput(e.target.value)}
            inputMode="decimal"
            placeholder={t('productForm.minSellingPricePlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.taxRate')}
          <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) as TaxRate)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            <option value={19}>19%</option>
            <option value={9}>9%</option>
            <option value={0}>{t('productForm.taxExempt')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('productForm.threshold')}
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            inputMode="numeric"
            placeholder={t('productForm.thresholdPlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={isPerishable}
          onChange={(e) => setIsPerishable(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        {t('productForm.perishable')}
      </label>
      {initial && (
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          {t('productForm.active')}
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={submitting} type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
