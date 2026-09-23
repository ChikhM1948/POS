'use client';

import { useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import type { AuthResult } from '@pos-dz/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  onSwitchToLogin: () => void;
}

/**
 * Premier lancement : crée le commerce (tenant) et son compte administrateur en un seul appel.
 * C'est ce compte qui pourra ensuite provisionner les caissiers/gestionnaires de stock (voir
 * /admin/team). Distinct du login habituel (email + mot de passe + tenantId déjà connu).
 */
export function AdminSetupForm({ onSwitchToLogin }: Props) {
  const { t } = useTranslation();
  const { login } = useAdminAuth();
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, adminName, email, password, phone: phone || undefined, syncEnabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('adminSetup.errorDefault'));
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminSetup.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tenantId);
      setCopied(true);
    } catch {
      // copie manuelle en secours — l'identifiant reste affiché et sélectionnable
    }
  }

  function handleContinue() {
    if (!result) return;
    login({ token: result.token, tenantId: result.tenantId, userId: result.user.id, name: result.user.name, role: result.user.role });
  }

  if (result) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 px-4 py-12">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-popover">
          <div className="flex flex-col items-center gap-3 text-center">
            <BrandMark size={44} />
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">{t('adminSetup.resultTitle')}</h1>
              <p className="text-sm text-neutral-500">{t('adminSetup.resultSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2">
            <code className="flex-1 truncate text-sm text-neutral-900">{result.tenantId}</code>
            <button type="button" onClick={handleCopy} className="shrink-0 text-xs font-medium text-brand-600 hover:underline">
              {copied ? t('adminSetup.copied') : t('adminSetup.copy')}
            </button>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            className="mt-1 flex items-center justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
          >
            {t('adminSetup.continueToBackoffice')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 px-4 py-12">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-popover"
      >
        <div className="mb-1 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{t('adminSetup.title')}</h1>
            <p className="text-sm text-neutral-500">{t('adminSetup.subtitle')}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.businessNameLabel')}
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t('adminSetup.businessNamePlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.adminNameLabel')}
          <input
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder={t('adminSetup.adminNamePlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.emailLabel')}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('adminSetup.emailPlaceholder')}
            type="email"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.phoneLabel')}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('adminSetup.phonePlaceholder')}
            type="tel"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">{t('adminSetup.modeLabel')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSyncEnabled(true)}
              aria-pressed={syncEnabled}
              className={`rounded-lg border px-3 py-2 text-start text-sm transition ${
                syncEnabled ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span className="block font-semibold">{t('adminSetup.modeSyncTitle')}</span>
              <span className="block text-xs text-neutral-500">{t('adminSetup.modeSyncDescription')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSyncEnabled(false)}
              aria-pressed={!syncEnabled}
              className={`rounded-lg border px-3 py-2 text-start text-sm transition ${
                !syncEnabled ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span className="block font-semibold">{t('adminSetup.modeLocalTitle')}</span>
              <span className="block text-xs text-neutral-500">{t('adminSetup.modeLocalDescription')}</span>
            </button>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.passwordLabel')}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminSetup.passwordPlaceholder')}
            type="password"
            minLength={6}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          type="submit"
          className="mt-1 flex items-center justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t('adminSetup.submitting') : t('adminSetup.submit')}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          {t('adminSetup.switchToLogin')}
        </button>
      </form>
    </div>
  );
}
