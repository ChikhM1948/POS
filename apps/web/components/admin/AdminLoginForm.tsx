'use client';

import { useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { BrandMark } from '../BrandMark';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  onSwitchToSetup: () => void;
}

/** Login back-office standard (email + mot de passe) — distinct du login PIN de la caisse. */
export function AdminLoginForm({ onSwitchToSetup }: Props) {
  const { login } = useAdminAuth();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Connexion refusée.');
      }
      const { token, user } = await res.json();
      login({ token, tenantId, userId: user.id, name: user.name, role: user.role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-popover"
      >
        <div className="mb-1 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Back-office</h1>
            <p className="text-sm text-neutral-500">Connectez-vous pour gérer votre commerce</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Identifiant boutique (tenant)
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="ex. tenant_demo"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@commerce.dz"
            type="email"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Mot de passe
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
            required
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          type="submit"
          className="mt-1 flex items-center justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        <button
          type="button"
          onClick={onSwitchToSetup}
          className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          Nouveau commerce ? Créez votre compte administrateur
        </button>

        <a href="/" className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline">
          Retour à la caisse
        </a>
      </form>
    </div>
  );
}
