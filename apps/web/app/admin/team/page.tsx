'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { UserForm } from '../../../components/admin/UserForm';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { IconPlus } from '../../../components/icons';
import type { CreateUserInput, UserDTO } from '@pos-dz/shared';

export default function TeamPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
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
    if (!confirm(t('team.confirmDeactivate', { name: user.name }))) return;
    await adminFetch(session.token, `/users/${user.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{t('team.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          {t('team.newMember')}
        </button>
      </div>

      {showForm && <UserForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">{t('team.tableName')}</th>
              <th className="px-4 py-2">{t('team.tableEmail')}</th>
              <th className="px-4 py-2">{t('team.tableRole')}</th>
              <th className="px-4 py-2">{t('team.tablePin')}</th>
              <th className="px-4 py-2">{t('team.tableStatus')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-medium text-neutral-900">{u.name}</td>
                <td className="px-4 py-2.5 text-neutral-600">{u.email}</td>
                <td className="px-4 py-2.5 text-neutral-600">{t(`roles.${u.role}`)}</td>
                <td className="px-4 py-2.5 text-neutral-600">{u.hasPinCode ? t('common.yes') : t('common.dash')}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                    {u.active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-end">
                  {u.active && (
                    <button onClick={() => handleDeactivate(u)} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
                      {t('common.deactivate')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  {t('team.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
