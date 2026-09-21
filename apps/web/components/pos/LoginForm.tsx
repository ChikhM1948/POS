'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '../BrandMark';
import { clearRegisterConfig, loadRegisterConfig, saveRegisterConfig, type RegisterConfig } from '../../lib/registerConfig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Session {
  token: string;
  tenantId: string;
  storeId: string;
  cashierId: string;
  cashierName: string;
}

/**
 * Connexion caisse en deux étapes : configuration du poste (tenant + boutique, une seule fois par
 * appareil, enregistrée en local) puis connexion PIN à chaque prise de service — voir
 * POST /auth/login-pin (apps/api/src/modules/auth). Une fois le poste configuré, le caissier ne
 * voit plus jamais d'identifiants techniques : seul son PIN (créé par l'admin, voir /admin/team)
 * est demandé.
 */
type LoginMethod = 'pin' | 'password';

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [config, setConfig] = useState<RegisterConfig | null | undefined>(undefined); // undefined = pas encore lu du localStorage
  const [tenantId, setTenantId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [method, setMethod] = useState<LoginMethod>('pin');
  const [pinCode, setPinCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setConfig(loadRegisterConfig());
  }, []);

  function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: RegisterConfig = { tenantId: tenantId.trim(), storeId: storeId.trim() };
    saveRegisterConfig(next);
    setConfig(next);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setError(null);
    setLoading(true);
    try {
      // Deux identifiants possibles pour le même compte cashier : PIN rapide (login-pin) ou
      // email + mot de passe (login-cashier) — tous deux réservés au rôle cashier côté API.
      const path = method === 'pin' ? '/auth/login-pin' : '/auth/login-cashier';
      const body =
        method === 'pin'
          ? { tenantId: config.tenantId, storeId: config.storeId, pinCode }
          : { tenantId: config.tenantId, email, password };

      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? 'Connexion refusée.');
      }
      const { token, user } = await res.json();
      onLogin({ token, tenantId: config.tenantId, storeId: config.storeId, cashierId: user.id, cashierName: user.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
      setPinCode('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  function handleChangeStore() {
    clearRegisterConfig();
    setConfig(null);
    setTenantId('');
    setStoreId('');
    setPinCode('');
    setEmail('');
    setPassword('');
    setError(null);
  }

  function switchMethod(next: LoginMethod) {
    setMethod(next);
    setError(null);
    setPinCode('');
    setPassword('');
  }

  // Avant lecture du localStorage, on ne sait pas encore si ce poste est déjà configuré — un
  // indicateur de chargement évite un flash de l'écran de configuration.
  if (config === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-neutral-950">
        <p className="text-sm text-white/50">Chargement…</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-neutral-950 px-4 py-12">
        <form
          onSubmit={handleSetupSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-white p-8 shadow-popover"
        >
          <div className="mb-1 flex flex-col items-center gap-3 text-center">
            <BrandMark size={44} />
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">Configuration du poste</h1>
              <p className="text-sm text-neutral-500">
                À faire une seule fois par appareil — identifiants donnés par votre administrateur.
              </p>
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
            Point de vente
            <input
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="ex. store_alger_01"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-1 flex items-center justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
          >
            Enregistrer ce poste
          </button>

          <p className="text-center text-xs text-neutral-400">POS Algérie · Caisse hors-ligne, synchronisée automatiquement</p>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-950 via-brand-900 to-neutral-950 px-4 py-12">
      <form
        onSubmit={handleLoginSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-white p-8 shadow-popover"
      >
        <div className="mb-1 flex flex-col items-center gap-3 text-center">
          <BrandMark size={44} />
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Connexion caisse</h1>
            <p className="text-sm text-neutral-500">Identifiez-vous pour ouvrir la session de vente</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => switchMethod('pin')}
            className={`rounded-md py-1.5 text-sm font-semibold transition ${
              method === 'pin' ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Code PIN
          </button>
          <button
            type="button"
            onClick={() => switchMethod('password')}
            className={`rounded-md py-1.5 text-sm font-semibold transition ${
              method === 'password' ? 'bg-white text-neutral-900 shadow-card' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Email / mot de passe
          </button>
        </div>

        {method === 'pin' ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Code PIN
            <input
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="••••"
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-center text-lg tracking-[0.6em] text-neutral-900 placeholder:tracking-normal placeholder:text-neutral-400"
              required
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@commerce.dz"
                type="email"
                autoFocus
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
          </>
        )}

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
          onClick={handleChangeStore}
          className="text-center text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
        >
          Changer de boutique
        </button>
      </form>
    </div>
  );
}
