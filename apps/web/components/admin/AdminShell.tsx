'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';
import { IconBox, IconChart, IconLayers, IconLogout, IconReceipt, IconSettings, IconUsers } from '../icons';
import type { UserRole } from '@pos-dz/shared';

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  roles?: UserRole[]; // omis = visible pour tous les rôles admis en back-office
}

const NAV: NavItem[] = [
  { href: '/admin/products', label: 'Produits', icon: IconBox },
  { href: '/admin/stock', label: 'Stock', icon: IconLayers },
  // Ventes/Rapports exposent des données financières — réservés aux mêmes rôles que côté API
  // (voir server.ts), pour ne pas afficher un lien qui renverrait systématiquement un 403.
  { href: '/admin/sales', label: 'Ventes', icon: IconReceipt, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/reports', label: 'Rapports', icon: IconChart, roles: ['store_admin', 'super_admin'] },
  // Provisionnement de l'équipe et branding — mêmes rôles que /users et /tenant côté API.
  { href: '/admin/team', label: 'Équipe', icon: IconUsers, roles: ['store_admin', 'super_admin'] },
  { href: '/admin/settings', label: 'Paramètres', icon: IconSettings, roles: ['store_admin', 'super_admin'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  cashier: 'Caissier',
  stock_manager: 'Gestionnaire de stock',
  store_admin: 'Administrateur boutique',
  super_admin: 'Administrateur',
};

export function AdminShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAdminAuth();
  const pathname = usePathname();
  const visibleNav = NAV.filter((item) => !item.roles || (session && item.roles.includes(session.role)));

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <BrandMark size={32} />
          <div>
            <p className="text-sm font-semibold leading-tight text-neutral-900">POS Algérie</p>
            <p className="text-xs text-neutral-400">Back-office</p>
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
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
          <div className="text-sm">
            <p className="font-medium text-neutral-900">{session?.name}</p>
            <p className="text-xs text-neutral-400">{session ? ROLE_LABELS[session.role] : ''}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <IconLogout className="h-4 w-4" />
            Déconnexion
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
