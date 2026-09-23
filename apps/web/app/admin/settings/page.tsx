'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { TenantSettingsForm } from '../../../components/admin/TenantSettingsForm';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import type { TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [tenant, setTenant] = useState<TenantSettingsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const { tenant } = await adminFetch<{ tenant: TenantSettingsDTO }>(session.token, '/tenant');
      setTenant(tenant);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(input: UpdateTenantSettingsInput) {
    if (!session) return;
    const { tenant } = await adminFetch<{ tenant: TenantSettingsDTO }>(session.token, '/tenant', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    setTenant(tenant);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">{t('settings.title')}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {tenant && <TenantSettingsForm initial={tenant} onSubmit={handleSubmit} />}
    </div>
  );
}
