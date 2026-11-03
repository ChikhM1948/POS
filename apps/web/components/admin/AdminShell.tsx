'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminFetch } from '../../lib/adminApi';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { useLoadBranding } from '../../lib/branding';
import { LicenseGate } from '../LicenseGate';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { IconBarcode, IconBox, IconChart, IconLayers, IconLogout, IconReceipt, IconSettings, IconTruck, IconUsers, IconWallet } from '../icons';
import type { StockAlertsDTO, StoreDTO, UserRole } from '@pos-dz/shared';

interface NavItem {
  href: string;
  labelKey: 'products' | 'stock' | 'sales' | 'reports' | 'taxes' | 'documents' | 'accounting' | 'suppliers' | 'barcodes' | 'customers' | 'team' | 'settings';
  icon: (props: { className?: string }) => JSX.Element;
  roles?: UserRole[]; // omis = visible pour tous les rôles admis en back-office
}

const NAV: NavItem[] = [
  { href: '/admin/products', labelKey: 'products', icon: IconBox },
  { href: '/admin/stock', labelKey: 'stock', icon: IconLayers },
  { href: '/admin/barcodes', labelKey: 'barcodes', icon: IconBarcode, roles: ['store_admin', 'stock_manager', 'super_admin'] },
  // Ventes/Rapports exposent des données financières — réservés aux mêmes rôles que côté API
  // (voir server.ts), pour ne pas afficher un lien qui renverrait systématiquement un 403.
  { href: '/admin/sales', labelKey: 'sales', icon: IconReceipt, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/reports', labelKey: 'reports', icon: IconChart, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/documents', labelKey: 'documents', icon: IconReceipt, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/taxes', labelKey: 'taxes', icon: IconReceipt, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/accounting', labelKey: 'accounting', icon: IconChart, roles: ['store_admin', 'super_admin'] },
  // Fournisseurs : mêmes rôles que /stock/purchases côté API (ceux qui font les achats).
  { href: '/admin/suppliers', labelKey: 'suppliers', icon: IconTruck, roles: ['store_admin', 'stock_manager', 'super_admin'] },
  // Clients/dettes : données financières, réservées aux admins — voir customers.controller.ts.
  { href: '/admin/customers', labelKey: 'customers', icon: IconWallet, roles: ['store_admin', 'super_admin'] },
  // Provisionnement de l'équipe et branding — mêmes rôles que /users et /tenant côté API.
  { href: '/admin/team', labelKey: 'team', icon: IconUsers, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/settings', labelKey: 'settings', icon: IconSettings, roles: ['store_admin', 'super_admin'] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAdminAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<StockAlertsDTO | null>(null);

  // Pastille « à traiter » sur Stock : produits sous leur seuil + lots périmés / bientôt périmés (boutique principale).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { stores } = await adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores');
        const store = stores.find((s) => s.isMainStore) ?? stores[0];
        if (!store) return;
        const { alerts } = await adminFetch<{ alerts: StockAlertsDTO }>(session.token, `/stock/alerts?storeId=${store.id}`);
        if (!cancelled) setAlerts(alerts);
      } catch {
        /* la pastille est facultative */
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, pathname]);
  const stockBadge = alerts ? alerts.lowStockCount + alerts.expiringSoonCount + alerts.expiredCount : 0;
  const stockBadgeTitle = alerts
    ? [
        alerts.lowStockCount > 0 && t('inventory.alertsLow', { n: alerts.lowStockCount }),
        alerts.expiredCount > 0 && t('inventory.alertsExpired', { n: alerts.expiredCount }),
        alerts.expiringSoonCount > 0 && t('inventory.alertsExpiring', { n: alerts.expiringSoonCount }),
      ].filter(Boolean).join(' · ')
    : '';
  useLoadBranding(session?.token);
  const visibleNav = NAV.filter((item) => !item.roles || (session && item.roles.includes(session.role)));

  return (
    <div className="flex min-h-screen bg-neutral-50 print:block print:min-h-0">
      <aside className="flex w-60 print:hidden shrink-0 flex-col border-e border-neutral-200 bg-white p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <BrandMark size={32} />
          <div>
            <p className="text-sm font-semibold leading-tight tracking-tight text-neutral-900">POS Algérie</p>
            <p className="text-xs text-neutral-400">{t('adminShell.subtitle')}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {t(`adminShell.nav.${item.labelKey}`)}
                {item.labelKey === 'stock' && stockBadge > 0 && (
                  <span
                    title={stockBadgeTitle}
                    className={`ms-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${alerts && alerts.expiredCount > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {stockBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4">
          <LanguageSwitcher />
        </div>
      </aside>
      <div className="flex flex-1 flex-col print:block">
        <header className="flex items-center justify-between print:hidden border-b border-neutral-200 bg-white px-6 py-3">
          <div className="text-sm">
            <p className="font-medium text-neutral-900">{session?.name}</p>
            <p className="text-xs text-neutral-400">{session ? t(`roles.${session.role}`) : ''}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <IconLogout className="h-4 w-4" />
            {t('common.logout')}
          </button>
        </header>
        {session && <LicenseGate token={session.token} canActivate={session.role === 'store_admin' || session.role === 'super_admin'} />}
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
