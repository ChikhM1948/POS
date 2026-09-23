'use client';

import { useState, type ReactNode } from 'react';
import { AdminSessionProvider, useAdminAuth } from '../../lib/adminAuth';
import { AdminLoginForm } from '../../components/admin/AdminLoginForm';
import { AdminSetupForm } from '../../components/admin/AdminSetupForm';
import { AdminShell } from '../../components/admin/AdminShell';
import { useTranslation } from '../../lib/i18n/LanguageContext';

function Gate({ children }: { children: ReactNode }) {
  const { session, ready } = useAdminAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  // Avant hydratation, on ne sait pas encore si une session existe (lecture localStorage côté
  // client) — un indicateur de chargement évite à la fois un flash du login ET une page vide.
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      </div>
    );
  }
  if (!session) {
    return mode === 'login' ? (
      <AdminLoginForm onSwitchToSetup={() => setMode('setup')} />
    ) : (
      <AdminSetupForm onSwitchToLogin={() => setMode('login')} />
    );
  }
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <Gate>{children}</Gate>
    </AdminSessionProvider>
  );
}
