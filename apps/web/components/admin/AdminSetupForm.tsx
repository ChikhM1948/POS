'use client';

import { useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { LOCAL_MODE } from '../../lib/localMode';
import { parseIdentifier } from '@pos-dz/shared';
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
  const { t, locale } = useTranslation();
  const { login } = useAdminAuth();
  // Deux modes d'inscription : email ou téléphone (l'un ou l'autre sert ensuite d'identifiant de connexion).
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const identifier = parseIdentifier(method === 'email' ? email : phone);
    if (!identifier || identifier.kind !== method) {
      setError(t(method === 'email' ? 'adminSetup.errorInvalidEmail' : 'adminSetup.errorInvalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.value, password, syncEnabled: !LOCAL_MODE, activationKey: activationKey.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('adminSetup.errorDefault'));
      }
      const created: AuthResult = await res.json();
      login({
        token: created.token,
        tenantId: created.tenantId,
        userId: created.user.id,
        name: created.user.name,
        role: created.user.role,
        canViewPurchasePrice: created.user.canViewPurchasePrice,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminSetup.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center auth-bg px-4 py-12">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 sheet rounded-3xl bg-white p-9 shadow-popover ring-1 ring-neutral-200"
      >
        <div className="mb-1 flex flex-col items-center gap-3 text-center">
          <BrandMark size={60} />
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900">{t('adminSetup.title')}</h1>
            <p className="text-sm text-neutral-500">{t('adminSetup.subtitle')}</p>
          </div>
        </div>

        <div role="tablist" className="grid grid-cols-2 gap-0.5 rounded-[0.7rem] bg-black/[0.06] p-0.5 text-sm font-medium">
          {(['email', 'phone'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => { setMethod(m); setError(null); }}
              className={`rounded-lg py-1.5 transition ${method === m ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {t(m === 'email' ? 'adminSetup.methodEmail' : 'adminSetup.methodPhone')}
            </button>
          ))}
        </div>

        {method === 'email' ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('adminSetup.emailLabel')}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('adminSetup.emailPlaceholder')}
              type="email"
              inputMode="email"
              autoComplete="email"
              className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-brand-500/40"
              required
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('adminSetup.phoneLoginLabel')}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('adminSetup.phonePlaceholder')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-brand-500/40"
              required
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('adminSetup.passwordLabel')}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminSetup.passwordPlaceholder')}
            type="password"
            minLength={6}
            className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-brand-500/40"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {locale === 'ar' ? 'مفتاح التفعيل' : "Clé d'activation"}{locale === 'ar' ? ' (اختياري)' : ' (optionnelle)'}
          <input
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            placeholder="POS-XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            spellCheck={false}
            dir="ltr"
            className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-brand-500/40"
                      />
          <span className="text-xs font-normal text-neutral-500">
            {LOCAL_MODE
              ? locale === 'ar'
                ? 'اختياري: اتركه فارغًا لبدء فترة تجريبية مجانية (14 يومًا) دون إنترنت.'
                : "Facultatif : laissez vide pour démarrer l'essai gratuit de 14 jours, sans Internet."
              : locale === 'ar'
                ? 'اختياري: اتركه فارغًا لبدء فترة تجريبية مجانية (14 يومًا).'
                : "Facultatif : laissez vide pour démarrer l'essai gratuit de 14 jours."}
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          type="submit"
          className="mt-1 flex items-center justify-center rounded-xl bg-brand-600 py-3 text-[15px] font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
