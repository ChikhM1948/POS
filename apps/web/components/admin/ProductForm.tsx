'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ProductDTO, ProductInput, TaxRate } from '@pos-dz/shared';

const centsToInput = (cents?: number) => (cents !== undefined ? (cents / 100).toFixed(2) : '0.00');
const inputToCents = (value: string) => Math.round(parseFloat(value.replace(',', '.') || '0') * 100);

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
}

/** Formulaire création/édition — les montants sont saisis en DZD et convertis en centimes à la soumission. */
export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [nameFr, setNameFr] = useState(initial?.name.fr ?? '');
  const [nameAr, setNameAr] = useState(initial?.name.ar ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imageError, setImageError] = useState<string | null>(null);
  const [unit, setUnit] = useState(initial?.unit ?? 'unité');
  const [priceInput, setPriceInput] = useState(centsToInput(initial?.sellingPriceCents));
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
        taxRate,
        isPerishable,
        lowStockThreshold: threshold ? parseInt(threshold, 10) : undefined,
        active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Le fichier doit être une image.');
      return;
    }
    try {
      setImageError(null);
      setImageUrl(await resizeImageToDataUrl(file));
    } catch {
      setImageError("Impossible de charger l'image.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h3 className="text-base font-semibold text-neutral-900">{initial ? 'Modifier le produit' : 'Nouveau produit'}</h3>

      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-neutral-400">Photo</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="w-fit cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
            {imageUrl ? "Changer l'image" : 'Ajouter une image'}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl('')} className="text-left text-xs font-medium text-red-600 hover:underline">
              Retirer l'image
            </button>
          )}
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          SKU
          <input value={sku} onChange={(e) => setSku(e.target.value)} required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Code-barres
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Nom (FR)
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          الاسم (AR)
          <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Catégorie
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Unité
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Prix de vente (DZD)
          <input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} inputMode="decimal" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          TVA
          <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) as TaxRate)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            <option value={19}>19%</option>
            <option value={9}>9%</option>
            <option value={0}>Exonéré</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Seuil critique de stock
          <input value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" placeholder="ex. 5" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={isPerishable}
          onChange={(e) => setIsPerishable(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        Produit périssable (lot / date de péremption suivis au mouvement de stock)
      </label>
      {initial && (
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          Actif
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={submitting} type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
          Annuler
        </button>
      </div>
    </form>
  );
}
