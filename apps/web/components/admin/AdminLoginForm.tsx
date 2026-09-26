'use client';

import { useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from '../../lib/i18n/LanguageContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  onSwitchToSetup: () => void;
}

/** Login back-office standard (email + mot de passe) — distinct du login PIN de la caisse. */
export function AdminLoginForm({ onSwitchToSetup }: Props) {
  const { t } = useTranslation();
  const { login } = useAdminAuth();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('adminLogin.errorDefault'));
      }
      const { token, user } = await res.json();
      login({ token, tenantId, userId: user.id, name: user.name, role: user.role, canViewPurchasePrice: user.canViewPurchasePrice });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminLogin.errorGeneric'));
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-lg font-semibold text-neutral-900">{t('adminLogin.title')}</h1>
            <p className="text-sm text-neutral-500">{t('adminLogin.subtitle')}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminLogin.tenantLabel')}
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder={t('adminLogin.tenantPlaceholder')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminLogin.emailLabel')}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('adminLogin.emailPlaceholder')}
            type="email"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminLogin.passwordLabel')}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminLogin.passwordPlaceholder')}
            type="password"
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
          {loading ? t('adminLogin.submitting') : t('adminLogin.submit')}
        </button>

        <button
          type="button"
          onClick={onSwitchToSetup}
          className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          {t('adminLogin.switchToSetup')}
        </button>

        <a href="/" className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline">
          {t('adminLogin.backToPos')}
        </a>
      </form>
    </div>
  );
}
