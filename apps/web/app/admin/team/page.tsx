'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { UserForm } from '../../../components/admin/UserForm';
import { IconPlus } from '../../../components/icons';
import type { CreateUserInput, UserDTO, UserRole } from '@pos-dz/shared';

const ROLE_LABELS: Record<UserRole, string> = {
  cashier: 'Caissier',
  stock_manager: 'Gestionnaire de stock',
  store_admin: 'Administrateur boutique',
  super_admin: 'Administrateur',
};

export default function TeamPage() {
  const { session } = useAdminAuth();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { users } = await adminFetch<{ users: UserDTO[] }>(session.token, '/users');
      setUsers(users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(input: CreateUserInput) {
    if (!session) return;
    await adminFetch(session.token, '/users', { method: 'POST', body: JSON.stringify(input) });
    setShowForm(false);
    await load();
  }

  async function handleDeactivate(user: UserDTO) {
    if (!session) return;
    if (!confirm(`Désactiver le compte de "${user.name}" ? Il ne pourra plus se connecter.`)) return;
    await adminFetch(session.token, `/users/${user.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Équipe</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          Nouveau membre
        </button>
      </div>

      {showForm && <UserForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rôle</th>
              <th className="px-4 py-2">PIN caisse</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">{u.name}</td>
                <td className="px-4 py-2.5 text-neutral-600">{u.email}</td>
                <td className="px-4 py-2.5 text-neutral-600">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2.5 text-neutral-600">{u.hasPinCode ? 'Oui' : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {u.active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.active && (
                    <button onClick={() => handleDeactivate(u)} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
                      Désactiver
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Aucun membre pour l'instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
