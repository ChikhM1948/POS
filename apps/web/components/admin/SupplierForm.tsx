'use client';

import { useState, type FormEvent } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import type { SupplierInput } from '@pos-dz/shared';

interface Props {
  onSubmit: (input: SupplierInput) => Promise<void>;
  onCancel: () => void;
}

export function SupplierForm({ onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('supplierForm.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h3 className="text-base font-semibold text-neutral-900">{t('supplierForm.title')}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('supplierForm.name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('supplierForm.phone')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        <label className="col-span-full flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('supplierForm.address')}
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button disabled={submitting} type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? t('common.saving') : t('supplierForm.submit')}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
