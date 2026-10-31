'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AdminSessionProvider, useAdminAuth } from '../../lib/adminAuth';
import { AdminLoginForm } from '../../components/admin/AdminLoginForm';
import { AdminSetupForm } from '../../components/admin/AdminSetupForm';
import { AdminShell } from '../../components/admin/AdminShell';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { LOCAL_MODE, fetchLocalInfo } from '../../lib/localMode';

function Gate({ children }: { children: ReactNode }) {
  const { session, ready } = useAdminAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  // Poste local : premier lancement (aucun commerce encore enregistré) => on ouvre directement la création du compte.
  const [localChecked, setLocalChecked] = useState(!LOCAL_MODE);
  useEffect(() => {
    if (!LOCAL_MODE) return;
    fetchLocalInfo().then((info) => {
      setMode(info.configured ? 'login' : 'setup');
      setLocalChecked(true);
    });
  }, []);
  // Avant hydratation, on ne sait pas encore si une session existe (lecture localStorage côté
  // client) — un indicateur de chargement évite à la fois un flash du login ET une page vide.
  if (!ready || !localChecked) {
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
