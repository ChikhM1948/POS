'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from '@pos-dz/shared';

export interface AdminSession {
  token: string;
  tenantId: string;
  userId: string;
  name: string;
  role: UserRole;
}

const STORAGE_KEY = 'pos-admin-session';

interface AdminAuthContextValue {
  session: AdminSession | null;
  login: (session: AdminSession) => void;
  logout: () => void;
  ready: boolean; // true une fois le localStorage lu — évite un flash de l'écran de login au premier rendu
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // stockage indisponible (navigation privée) — l'utilisateur devra simplement se reconnecter
    } finally {
      setReady(true);
    }
  }, []);

  function login(next: AdminSession) {
    setSession(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* voir ci-dessus */
    }
  }

  function logout() {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* voir ci-dessus */
    }
  }

  return <AdminAuthContext.Provider value={{ session, login, logout, ready }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth doit être utilisé sous AdminSessionProvider');
  return ctx;
}
