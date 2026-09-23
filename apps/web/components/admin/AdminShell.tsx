'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { IconBox, IconChart, IconLayers, IconLogout, IconReceipt, IconSettings, IconTruck, IconUsers, IconWallet } from '../icons';
import type { UserRole } from '@pos-dz/shared';

interface NavItem {
  href: string;
  labelKey: 'products' | 'stock' | 'sales' | 'reports' | 'suppliers' | 'customers' | 'team' | 'settings';
  icon: (props: { className?: string }) => JSX.Element;
  roles?: UserRole[]; // omis = visible pour tous les rôles admis en back-office
}

const NAV: NavItem[] = [
  { href: '/admin/products', labelKey: 'products', icon: IconBox },
  { href: '/admin/stock', labelKey: 'stock', icon: IconLayers },
  // Ventes/Rapports exposent des données financières — réservés aux mêmes rôles que côté API
  // (voir server.ts), pour ne pas afficher un lien qui renverrait systématiquement un 403.
  { href: '/admin/sales', labelKey: 'sales', icon: IconReceipt, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/reports', labelKey: 'reports', icon: IconChart, roles: ['store_admin', 'super_admin'] },
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
  const visibleNav = NAV.filter((item) => !item.roles || (session && item.roles.includes(session.role)));

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-60 shrink-0 flex-col border-e border-neutral-200 bg-white p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <BrandMark size={32} />
          <div>
            <p className="text-sm font-semibold leading-tight text-neutral-900">POS Algérie</p>
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
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white shadow-card' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {t(`adminShell.nav.${item.labelKey}`)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4">
          <LanguageSwitcher />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
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
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
