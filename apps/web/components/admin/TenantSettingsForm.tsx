'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

const MAX_LOGO_DIMENSION = 320;

/** Redimensionne côté client avant stockage (data URL) — évite un document tenant trop lourd. */
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Rendu image indisponible.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface Props {
  initial: TenantSettingsDTO;
  onSubmit: (input: UpdateTenantSettingsInput) => Promise<void>;
}

/** Branding du commerce — logo, téléphone, couleurs — imprimé sur les tickets et affiché au back-office. */
export function TenantSettingsForm({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.branding.logoUrl ?? '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(initial.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.branding.secondaryColor);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Le fichier doit être une image.');
      return;
    }
    try {
      setLogoError(null);
      setLogoUrl(await resizeImageToDataUrl(file));
    } catch {
      setLogoError("Impossible de charger l'image.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        branding: { logoUrl: logoUrl || undefined, primaryColor, secondaryColor },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-neutral-400">Logo</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="w-fit cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
            {logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl('')} className="text-left text-xs font-medium text-red-600 hover:underline">
              Retirer le logo
            </button>
          )}
          {logoError && <p className="text-xs text-red-600">{logoError}</p>}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Nom du commerce
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        Téléphone
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="0555 12 34 56"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Couleur principale
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-300"
            />
            <input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Couleur secondaire
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-300"
            />
            <input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500"
            />
          </div>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600">Paramètres enregistrés.</p>}

      <div>
        <button
          disabled={submitting}
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
