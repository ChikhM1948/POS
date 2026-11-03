'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { HEX_RE, buildScale, contrastWithWhite } from '../../lib/branding';
import type { TaxRegime, TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

const MAX_LOGO_DIMENSION = 320;
const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;

const PRESETS: { name: string; primary: string; secondary: string }[] = [
  { name: 'Ardoise', primary: '#1f2937', secondary: '#38bdf8' },
  { name: 'Bleu', primary: '#1d4ed8', secondary: '#f59e0b' },
  { name: 'Émeraude', primary: '#047857', secondary: '#facc15' },
  { name: 'Rouge', primary: '#b91c1c', secondary: '#0ea5e9' },
  { name: 'Violet', primary: '#6d28d9', secondary: '#f472b6' },
  { name: 'Orange', primary: '#c2410c', secondary: '#14b8a6' },
  { name: 'Turquoise', primary: '#0f766e', secondary: '#fb7185' },
];

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
  const [legal, setLegal] = useState({ address: initial.legal?.address ?? '', rc: initial.legal?.rc ?? '', nif: initial.legal?.nif ?? '', nis: initial.legal?.nis ?? '', ai: initial.legal?.ai ?? '' });
  const [logoUrl, setLogoUrl] = useState(initial.branding.logoUrl ?? '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(initial.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initial.branding.secondaryColor);
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(initial.taxRegime ?? 'real');
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
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setLogoError(t('tenantSettings.errorImageLoad'));
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
    if (!HEX_RE.test(primaryColor) || !HEX_RE.test(secondaryColor)) {
      setError(t('tenantSettings.invalidColor'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        legal: { address: legal.address.trim(), rc: legal.rc.trim(), nif: legal.nif.trim(), nis: legal.nis.trim(), ai: legal.ai.trim() },
        branding: { logoUrl /* '' = logo retiré : undefined serait ignoré par le serveur */, primaryColor, secondaryColor },
        taxRegime,
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
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
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

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-medium text-neutral-700">{t('tenantSettings.legalTitle')}</legend>
        {(['address', 'nif', 'nis', 'rc', 'ai'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t(`tenantSettings.${k}`)}
            <input
              value={legal[k]}
              onChange={(e) => setLegal({ ...legal, [k]: e.target.value })}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('tenantSettings.taxRegime')}
          <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value as TaxRegime)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500">
            <option value="real">{t('tenantSettings.taxRegimeReal')}</option>
            <option value="ifu">{t('tenantSettings.taxRegimeIfu')}</option>
          </select>
          <span className="text-xs font-normal text-neutral-500">{t('tenantSettings.taxRegimeHint')}</span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-medium text-neutral-700">{t('tenantSettings.palette')}</legend>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-neutral-500">{t('tenantSettings.palettePresets')}</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = p.primary.toLowerCase() === primaryColor.toLowerCase() && p.secondary.toLowerCase() === secondaryColor.toLowerCase();
              return (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  aria-label={p.name}
                  aria-pressed={active}
                  onClick={() => { setPrimaryColor(p.primary); setSecondaryColor(p.secondary); }}
                  className={`flex h-9 w-9 overflow-hidden rounded-full border-2 transition ${active ? 'border-neutral-900' : 'border-transparent hover:border-neutral-300'}`}
                >
                  <span className="h-full w-1/2" style={{ background: p.primary }} />
                  <span className="h-full w-1/2" style={{ background: p.secondary }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([
            ['primaryColor', primaryColor, setPrimaryColor],
            ['secondaryColor', secondaryColor, setSecondaryColor],
          ] as const).map(([key, value, setValue]) => (
            <label key={key} className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t(`tenantSettings.${key}`)}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_RE.test(value) ? value : '#000000'}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-300"
                />
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={7}
                  className={`w-full rounded-lg border px-3 py-1.5 text-neutral-900 focus:border-brand-500 ${HEX_RE.test(value) ? 'border-neutral-300' : 'border-red-400'}`}
                />
              </div>
            </label>
          ))}
        </div>

        {HEX_RE.test(primaryColor) && contrastWithWhite(primaryColor) < 3 && (
          <p className="text-xs text-amber-600">{t('tenantSettings.lowContrast')}</p>
        )}

        {HEX_RE.test(primaryColor) && HEX_RE.test(secondaryColor) && (() => {
          const scale = buildScale(primaryColor);
          const rgb = (c: number[]) => `rgb(${c.join(' ')})`;
          return (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-500">{t('tenantSettings.preview')}</span>
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: rgb(scale[50]) }}>
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white" style={logoUrl ? undefined : { background: primaryColor }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logoUrl && <img src={logoUrl} alt="" className="h-full w-full object-contain" />}
                </span>
                <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ background: primaryColor }}>{t('common.save')}</span>
                <span className="rounded-lg border px-3 py-1.5 text-sm font-medium" style={{ borderColor: rgb(scale[300]), color: rgb(scale[700]) }}>{name || '—'}</span>
                <span className="h-5 w-5 rounded-full" style={{ background: secondaryColor }} />
              </div>
            </div>
          );
        })()}

        <button
          type="button"
          onClick={() => { setPrimaryColor('#1f2937'); setSecondaryColor('#38bdf8'); }}
          className="w-fit text-xs font-medium text-neutral-500 hover:underline"
        >
          {t('tenantSettings.resetColors')}
        </button>
      </fieldset>

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
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
