'use client';

import { useCallback, useEffect, useState } from 'react';
import { LOCAL_MODE } from '../../lib/localMode';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SESSION_KEY = 'pos:superadmin-token';

type Kind = 'trial' | 'paid' | 'lifetime';
interface KeyRow {
  key: string; kind: Kind; durationDays: number; note?: string; revoked: boolean;
  redeemedAt?: string; expiresAt?: string; boundTo?: string; createdAt: string;
  assignedTenantId?: string; assignedTenantName?: string;
}
interface TenantOpt { id: string; name: string; slug: string }

async function call<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/license${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Erreur ${res.status}`), { status: res.status });
  return body as T;
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-DZ') : '—');
const stateOf = (k: KeyRow) => (k.revoked ? 'révoquée' : k.redeemedAt ? 'utilisée' : 'disponible');

/**
 * Console de l'éditeur : émission et suivi des clés d'activation du POS desktop.
 * Compte distinct des comptes commerce (voir apps/api PlatformAdmin) ; non disponible dans l'application bureau.
 */
export default function SuperAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setToken(sessionStorage.getItem(SESSION_KEY)); } catch { /* stockage indisponible */ }
    setReady(true);
  }, []);

  if (LOCAL_MODE || !ready) return null;
  const signOut = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } setToken(null); };
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      {token ? <Console token={token} onSignOut={signOut} /> : <Login onToken={(t) => { try { sessionStorage.setItem(SESSION_KEY, t); } catch { /* ignore */ } setToken(t); }} />}
    </main>
  );
}

function Login({ onToken }: { onToken: (t: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      onToken((await call<{ token: string }>(null, '/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })).token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8">
      <h1 className="text-lg font-semibold text-neutral-900">Super administrateur</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Email" required
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Mot de passe" required
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function Console({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [filter, setFilter] = useState({ kind: '', state: '', q: '' });
  const [form, setForm] = useState({ kind: 'paid' as Kind, count: 1, durationDays: '', note: '' });
  const [fresh, setFresh] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = useCallback((err: unknown) => {
    if ((err as { status?: number }).status === 401) return onSignOut(); // session expirée
    setError(err instanceof Error ? err.message : String(err));
  }, [onSignOut]);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      setKeys((await call<{ keys: KeyRow[] }>(token, `/admin/keys?${qs}`)).keys);
    } catch (err) { fail(err); }
  }, [token, filter, fail]);

  useEffect(() => { void load(); }, [load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = { kind: form.kind, count: form.count, note: form.note || undefined, durationDays: form.durationDays ? Number(form.durationDays) : undefined };
      const res = await call<{ keys: { key: string }[] }>(token, '/admin/generate', { method: 'POST', body: JSON.stringify(body) });
      setFresh(res.keys.map((k) => k.key));
      await load();
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function resetBinding(key: string) {
    if (!window.confirm(`Délier ${key} de son poste ? L'ancien poste sera verrouillé dès son prochain contact avec le serveur (au plus 30 jours s'il est hors-ligne) ; le prochain poste qui saisit la clé la reprend (expiration inchangée).`)) return;
    try { await call(token, '/admin/reset-binding', { method: 'POST', body: JSON.stringify({ key }) }); await load(); } catch (err) { fail(err); }
  }

  async function assign(key: string, tenantId: string | null) {
    try { await call(token, '/admin/assign', { method: 'POST', body: JSON.stringify({ key, tenantId }) }); await load(); } catch (err) { fail(err); }
  }

  async function revoke(key: string) {
    if (!window.confirm(`Révoquer ${key} ? Le poste sera verrouillé à son prochain contact avec le serveur (au plus 30 jours s'il est hors-ligne).`)) return;
    try { await call(token, '/admin/revoke', { method: 'POST', body: JSON.stringify({ key }) }); await load(); } catch (err) { fail(err); }
  }

  const input = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900';
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Clés d'activation</h1>
        <button onClick={onSignOut} className="text-sm text-neutral-500 underline underline-offset-2">Déconnexion</button>
      </header>

      <form onSubmit={generate} className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-5">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })} className={input}>
          <option value="trial">Essai (14 j)</option>
          <option value="paid">Payante (365 j)</option>
          <option value="lifetime">À vie</option>
        </select>
        <input type="number" min={1} max={200} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} className={input} aria-label="Nombre de clés" />
        <input type="number" min={1} max={36500} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="Durée (jours) — défaut" className={input} />
        <input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note (client…)" className={input} />
        <button disabled={busy} className="rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">{busy ? '…' : 'Générer'}</button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

      {fresh.length > 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-green-900">
            <span>{fresh.length} clé{fresh.length > 1 ? 's' : ''} générée{fresh.length > 1 ? 's' : ''}</span>
            <button onClick={() => void navigator.clipboard?.writeText(fresh.join('\n'))} className="underline underline-offset-2">Copier</button>
          </div>
          <pre dir="ltr" className="select-all whitespace-pre-wrap font-mono text-sm text-green-900">{fresh.join('\n')}</pre>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Rechercher clé / note" className={`${input} min-w-48 flex-1`} />
        <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} className={input}>
          <option value="">Tous types</option><option value="trial">Essai</option><option value="paid">Payante</option><option value="lifetime">À vie</option>
        </select>
        <select value={filter.state} onChange={(e) => setFilter({ ...filter, state: e.target.value })} className={input}>
          <option value="">Tous états</option><option value="unused">Disponibles</option><option value="used">Utilisées</option><option value="revoked">Révoquées</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-start text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>{['Clé', 'Type', 'État', 'Magasin', 'Activée', 'Expire', 'Note', ''].map((h) => <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.key} className="border-t border-neutral-100">
                <td dir="ltr" className="select-all px-3 py-2 font-mono text-xs">{k.key}</td>
                <td className="px-3 py-2">{k.kind === 'lifetime' ? 'À vie' : k.kind === 'paid' ? 'Payante' : 'Essai'} · {k.durationDays} j</td>
                <td className="px-3 py-2">{stateOf(k)}{k.redeemedAt && !k.revoked && !k.boundTo ? ' (déliée)' : ''}</td>
                <td className="px-3 py-2"><TenantPicker token={token} current={k.assignedTenantName} disabled={k.revoked} onPick={(id) => void assign(k.key, id)} /></td>
                <td className="px-3 py-2">{fmt(k.redeemedAt)}</td>
                <td className="px-3 py-2">{fmt(k.expiresAt)}</td>
                <td className="px-3 py-2 text-neutral-500">{k.note ?? ''}</td>
                <td className="space-x-3 whitespace-nowrap px-3 py-2 text-end">
                  {!k.revoked && k.kind !== 'trial' && k.boundTo?.startsWith('device:') && <button onClick={() => void resetBinding(k.key)} className="text-neutral-600 underline underline-offset-2">Délier</button>}
                  {!k.revoked && <button onClick={() => void revoke(k.key)} className="text-red-600 underline underline-offset-2">Révoquer</button>}
                </td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-neutral-400">Aucune clé.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Liste déroulante avec recherche par nom (base de données) pour rattacher une clé à un magasin. */
function TenantPicker({ token, current, disabled, onPick }: { token: string; current?: string; disabled?: boolean; onPick: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<TenantOpt[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      call<{ tenants: TenantOpt[] }>(token, `/admin/tenants?q=${encodeURIComponent(q)}`).then((r) => setOpts(r.tenants)).catch(() => setOpts([]));
    }, 200);
    return () => clearTimeout(t);
  }, [open, q, token]);

  if (!open) {
    return (
      <button disabled={disabled} onClick={() => setOpen(true)} className="text-start underline-offset-2 hover:underline disabled:no-underline">
        {current ?? <span className="text-neutral-400">— Attribuer —</span>}
      </button>
    );
  }
  return (
    <div className="relative">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} placeholder="Nom du magasin…"
        className="w-44 rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
      <ul className="absolute z-10 mt-1 max-h-56 w-56 overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
        {current && <li><button className="w-full px-3 py-1.5 text-start text-red-600 hover:bg-neutral-50" onClick={() => { setOpen(false); onPick(null); }}>Retirer l'attribution</button></li>}
        {opts.map((t) => (
          <li key={t.id}><button className="w-full px-3 py-1.5 text-start hover:bg-neutral-50" onClick={() => { setOpen(false); onPick(t.id); }}>{t.name} <span className="text-xs text-neutral-400">{t.slug}</span></button></li>
        ))}
        {opts.length === 0 && <li className="px-3 py-2 text-neutral-400">Aucun résultat</li>}
        <li><button className="w-full border-t px-3 py-1.5 text-start text-neutral-500 hover:bg-neutral-50" onClick={() => setOpen(false)}>Annuler</button></li>
      </ul>
    </div>
  );
}
