'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { TenantSettingsForm } from '../../../components/admin/TenantSettingsForm';
import { CloudSyncPanel } from '../../../components/admin/CloudSyncPanel';
import { BackupPanel } from '../../../components/admin/BackupPanel';
import { AccountSettingsForm } from '../../../components/AccountSettingsForm';
import { useBranding } from '../../../lib/branding';
import { LOCAL_MODE } from '../../../lib/localMode';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import type { TenantSettingsDTO, UpdateTenantSettingsInput } from '@pos-dz/shared';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { session, login } = useAdminAuth();
  const canManageStore = session?.role === 'store_admin' || session?.role === 'super_admin';
  const { setBranding } = useBranding();
  const [tenant, setTenant] = useState<TenantSettingsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !canManageStore) return;
    try {
      const { tenant } = await adminFetch<{ tenant: TenantSettingsDTO }>(session.token, '/tenant');
      setTenant(tenant);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    }
  }, [session, canManageStore]);

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
    setBranding({ ...tenant.branding, name: tenant.name }); // applique immédiatement logo + couleurs à toute l'interface
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('settings.title')}</h1>
      {session && <AccountSettingsForm token={session.token} onTokenChange={(token) => login({ ...session, token })} />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {canManageStore && tenant && <TenantSettingsForm initial={tenant} onSubmit={handleSubmit} />}
      {canManageStore && LOCAL_MODE && <CloudSyncPanel />}
      {canManageStore && LOCAL_MODE && <BackupPanel />}
    </div>
  );
}
