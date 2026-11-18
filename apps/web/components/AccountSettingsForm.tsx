'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AccountDTO, UpdateAccountResult } from '@pos-dz/shared';
import { adminFetch } from '../lib/adminApi';
import { useTranslation } from '../lib/i18n/LanguageContext';

interface Props {
  token: string;
  onTokenChange: (token: string) => void;
}

export function AccountSettingsForm({ token, onTokenChange }: Props) {
  const { t } = useTranslation();
  const [account, setAccount] = useState<AccountDTO | null>(null);
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminFetch<{ account: AccountDTO }>(token, '/auth/account')
      .then(({ account }) => {
        if (cancelled) return;
        setAccount(account);
        setPhone(account.phone ?? '');
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : t('common.errorLoading')); });
    return () => { cancelled = true; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!account || saving) return;
    setError(null);
    setSaved(false);
    if (newPassword !== confirmation) {
      setError(t('account.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      const result = await adminFetch<UpdateAccountResult>(token, '/auth/account', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, phone, ...(newPassword ? { newPassword } : {}) }),
      });
      setAccount(result.account);
      setPhone(result.account.phone ?? '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      onTokenChange(result.token);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorGeneric'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-brand-500';
  return (
    <section className="rounded-xl bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold text-neutral-900">{t('account.title')}</h2>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="mt-3 text-sm text-emerald-700">{t('account.saved')}</p>}
      {!account ? (!error && <p className="mt-3 text-sm text-neutral-500">{t('common.loading')}</p>) : (
        <form onSubmit={submit} className="mt-4 flex max-w-lg flex-col gap-4">
          <p className="text-sm text-neutral-600">{t('account.identifier')}: <span dir="ltr">{account.email}</span></p>
          <fieldset disabled={saving} className="flex flex-col gap-4 disabled:opacity-60">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.phone')}
              <input type="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} className={inputClass} />
              <span className="text-xs font-normal text-neutral-500">{t('account.phoneHint')}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.currentPassword')}
              <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.newPassword')}
              <input type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setSaved(false); }} className={inputClass} />
              <span className="text-xs font-normal text-neutral-500">{t('account.passwordHint')}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.confirmPassword')}
              <input type="password" autoComplete="new-password" required={!!newPassword} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} />
            </label>
            <button type="submit" disabled={!newPassword && phone === (account.phone ?? '')} className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}

export function AccountSettingsDialog({ onClose, ...props }: Props & { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-label={t('account.title')} className="fixed inset-0 z-50 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-neutral-100 p-4 backdrop:bg-black/40">
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700">{t('common.close')}</button>
      </div>
      <AccountSettingsForm {...props} />
    </dialog>
  );
}
