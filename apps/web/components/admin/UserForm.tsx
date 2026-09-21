'use client';

import { useState, type FormEvent } from 'react';
import type { CreateUserInput, UserRole } from '@pos-dz/shared';

interface Props {
  onSubmit: (input: CreateUserInput) => Promise<void>;
  onCancel: () => void;
}

const ROLE_OPTIONS: { value: Extract<UserRole, 'cashier' | 'stock_manager'>; label: string }[] = [
  { value: 'cashier', label: 'Caissier' },
  { value: 'stock_manager', label: 'Gestionnaire de stock' },
];

/** Création d'un compte employé — auth simple (email + mot de passe) ; PIN optionnel pour la caisse. */
export function UserForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'cashier' | 'stock_manager'>>('cashier');
  const [pinCode, setPinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        pinCode: pinCode.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h3 className="text-base font-semibold text-neutral-900">Nouveau membre de l'équipe</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Nom
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Rôle
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Mot de passe
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength={6}
            required
            placeholder="6 caractères minimum"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </label>
        {role === 'cashier' && (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            PIN caisse
            <input
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              inputMode="numeric"
              placeholder="ex. 1234"
              required
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
            />
          </label>
        )}
      </div>
      {role === 'cashier' && (
        <p className="text-xs text-neutral-500">
          Le PIN est l'identifiant utilisé par le caissier pour se connecter à la caisse (identifiant boutique + PIN, sans email ni mot de passe).
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={submitting}
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Créer le compte'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
          Annuler
        </button>
      </div>
    </form>
  );
}
