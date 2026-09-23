'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
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
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.branding.logoUrl ?? '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(initial.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.branding.secondaryColor);
  const [syncEnabled, setSyncEnabled] = useState(initial.syncEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError(t('tenantSettings.errorImageType'));
      return;
    }
    try {
      setLogoError(null);
      setLogoUrl(await resizeImageToDataUrl(file));
    } catch {
      setLogoError(t('tenantSettings.errorImageLoad'));
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
        syncEnabled,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tenantSettings.errorSave'));
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
            <span className="text-xs text-neutral-400">{t('tenantSettings.logoPlaceholder')}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="w-fit cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
            {logoUrl ? t('tenantSettings.changeLogo') : t('tenantSettings.addLogo')}
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl('')} className="text-start text-xs font-medium text-red-600 hover:underline">
              {t('tenantSettings.removeLogo')}
            </button>
          )}
          {logoError && <p className="text-xs text-red-600">{logoError}</p>}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        {t('tenantSettings.name')}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        {t('tenantSettings.phone')}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder={t('tenantSettings.phonePlaceholder')}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('tenantSettings.primaryColor')}
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
          {t('tenantSettings.secondaryColor')}
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

      <label className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3">
        <input
          type="checkbox"
          checked={syncEnabled}
          onChange={(e) => setSyncEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-neutral-700">{t('tenantSettings.syncEnabled')}</span>
          <span className="text-xs text-neutral-500">{t('tenantSettings.syncEnabledHint')}</span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600">{t('tenantSettings.saved')}</p>}

      <div>
        <button
          disabled={submitting}
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
