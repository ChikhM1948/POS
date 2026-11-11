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

async function call<T>(token: string | null, path: string, init: RequestInit = {}, base = '/license'): Promise<T> {
  const res = await fetch(`${API}${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Erreur ${res.status}`), { status: res.status });
  return body as T;
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-DZ') : '-');
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
    <main className="auth-bg min-h-screen"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {token ? <Console token={token} onSignOut={signOut} /> : <Login onToken={(t) => { try { sessionStorage.setItem(SESSION_KEY, t); } catch { /* ignore */ } setToken(t); }} />}
    </div></main>
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
    <form onSubmit={submit} className="sheet mx-auto mt-24 flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-9 shadow-popover ring-1 ring-neutral-200">
      <h1 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-900">Super administrateur</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Email" required
        className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/40 focus:bg-white" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Mot de passe" required
        className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/40 focus:bg-white" />
      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function Console({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<'keys' | 'stores' | 'reviews'>('keys');
  return (
    <div className="flex flex-col gap-6">
      <nav className="sticky top-0 z-20 flex items-center gap-1 border-b border-neutral-200 bg-neutral-100 text-sm">
        {([['keys', "Clés d'activation"], ['stores', 'Magasins'], ['reviews', 'Avis']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-4 py-2.5 font-semibold transition ${tab === id ? 'border-brand-600 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>{label}</button>
        ))}
        <button onClick={onSignOut} className="ms-auto px-4 py-2.5 font-semibold text-neutral-500 transition hover:text-neutral-900">Déconnexion</button>
      </nav>
      {tab === 'keys' ? <KeysPanel token={token} onSignOut={onSignOut} /> : tab === 'stores' ? <StoresPanel token={token} onSignOut={onSignOut} /> : <ReviewsPanel token={token} onSignOut={onSignOut} />}
    </div>
  );
}

interface ReviewRow { id: string; name: string; business: string; rating: number; comment: string; approved: boolean; createdAt: string }

/** Modération des avis déposés sur la page d'accueil : invisibles tant qu'ils ne sont pas approuvés. */
function ReviewsPanel({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback((err: unknown) => {
    if ((err as { status?: number }).status === 401) return onSignOut();
    setError(err instanceof Error ? err.message : String(err));
  }, [onSignOut]);

  const load = useCallback(async () => {
    try { setRows(await call<ReviewRow[]>(token, '/admin', {}, '/reviews')); setError(null); } catch (err) { fail(err); }
  }, [token, fail]);
  useEffect(() => { void load(); }, [load]);

  async function setApproved(id: string, approved: boolean) {
    try { await call(token, `/admin/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved }) }, '/reviews'); await load(); } catch (err) { fail(err); }
  }
  async function remove(id: string) {
    if (!window.confirm('Supprimer définitivement cet avis ?')) return;
    try { await call(token, `/admin/${id}`, { method: 'DELETE' }, '/reviews'); await load(); } catch (err) { fail(err); }
  }

  const pending = rows.filter((r) => !r.approved).length;
  const shown = rows.filter((r) => filter === 'all' || (filter === 'pending' ? !r.approved : r.approved));
  const input = 'rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900';
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-900">Avis clients</h1>
      <div className="flex flex-wrap items-center gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={input} aria-label="Filtrer les avis">
          <option value="pending">En attente</option><option value="approved">Publiés</option><option value="all">Tous</option>
        </select>
        <span className="text-sm text-neutral-500">{pending} en attente · {rows.length - pending} publié{rows.length - pending > 1 ? 's' : ''}</span>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-neutral-900">{r.name}</span>
                {r.business && <span className="text-neutral-500">{r.business}</span>}
                <span className="text-amber-500" aria-label={`${r.rating} sur 5`}>{'★'.repeat(r.rating)}<span className="text-neutral-300">{'★'.repeat(5 - r.rating)}</span></span>
                <span className="text-xs text-neutral-400">{fmt(r.createdAt)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{r.approved ? 'Publié' : 'En attente'}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700">{r.comment}</p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm font-semibold">
              {r.approved
                ? <button onClick={() => void setApproved(r.id, false)} className="text-neutral-600 underline underline-offset-2">Dépublier</button>
                : <button onClick={() => void setApproved(r.id, true)} className="rounded-md bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700">Approuver</button>}
              <button onClick={() => void remove(r.id)} className="text-red-600 underline underline-offset-2">Supprimer</button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="rounded-2xl bg-white px-3 py-6 text-center text-neutral-400 shadow-card">Aucun avis.</li>}
      </ul>
    </div>
  );
}

interface StoreRow {
  id: string; name: string; slug: string; status: string; plan: string; createdAt: string;
  license?: { kind: Kind; expiresAt: string };
  keys: { key: string; kind: Kind; revoked: boolean; expiresAt?: string; used: boolean }[];
}

function StoresPanel({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      call<{ stores: StoreRow[] }>(token, `/admin/stores?q=${encodeURIComponent(q)}`)
        .then((r) => setStores(r.stores))
        .catch((err) => (err as { status?: number }).status === 401 ? onSignOut() : setError(err instanceof Error ? err.message : String(err)));
    }, 200);
    return () => clearTimeout(t);
  }, [token, q, onSignOut]);

  const kindLabel = (k: Kind) => (k === 'lifetime' ? 'À vie' : k === 'paid' ? 'Payante' : 'Essai');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-900">Magasins enregistrés</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom" className="rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/40 focus:bg-white" />
      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-start text-sm">
          <thead className="bg-black/[0.03] text-xs text-neutral-600">
            <tr>{['Magasin', 'Statut', 'Licence', 'Expire', 'Clés', 'Créé le'].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id} className="border-t border-black/[0.06] transition hover:bg-black/[0.02] align-top">
                <td className="px-4 py-3"><div className="font-medium text-neutral-900">{s.name}</div><div className="text-xs text-neutral-400">{s.slug}</div></td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">{s.license ? kindLabel(s.license.kind) : '-'}</td>
                <td className="px-4 py-3">{fmt(s.license?.expiresAt)}</td>
                <td dir="ltr" className="px-4 py-3 font-mono text-xs">
                  {s.keys.length === 0 ? <span className="text-neutral-400">-</span> : s.keys.map((k) => (
                    <div key={k.key} className={k.revoked ? 'text-neutral-400 line-through' : ''}>{k.key} <span className="font-sans text-neutral-500">· {k.used ? 'utilisée' : 'réservée'}</span></div>
                  ))}
                </td>
                <td className="px-4 py-3">{fmt(s.createdAt)}</td>
              </tr>
            ))}
            {stores.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-400">Aucun magasin.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeysPanel({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [filter, setFilter] = useState({ kind: '', state: '', q: '' });
  const [form, setForm] = useState({ kind: 'paid' as Kind, count: 1, durationDays: '', note: '' });
  const [store, setStore] = useState<TenantOpt | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState({ key: '', deviceId: '', code: '', kind: 'paid' as Kind, durationDays: '', note: '', usedKey: '' });

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
    if (!store) { setError('Sélectionnez un magasin avant de générer la clé.'); return; }
    setBusy(true); setError(null);
    try {
      const body = { tenantId: store.id, kind: form.kind, count: form.count, note: form.note || undefined, durationDays: form.durationDays ? Number(form.durationDays) : undefined };
      const res = await call<{ keys: { key: string }[] }>(token, '/admin/generate', { method: 'POST', body: JSON.stringify(body) });
      setFresh(res.keys.map((k) => k.key));
      await load();
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function offlineCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = { key: offline.key.trim() || undefined, deviceId: offline.deviceId.trim(), kind: offline.kind, durationDays: offline.durationDays ? Number(offline.durationDays) : undefined, note: offline.note || undefined };
      const res = await call<{ code: string; key: string }>(token, '/admin/offline-code', { method: 'POST', body: JSON.stringify(body) });
      setOffline((o) => ({ ...o, code: res.code, usedKey: res.key }));
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

  const input = 'rounded-xl border border-transparent bg-black/[0.05] px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500/40 focus:bg-white';
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-900">Clés d'activation</h1>

      <form onSubmit={generate} className="grid gap-3 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-6">
        <StoreSelect token={token} value={store} onChange={setStore} className={input} />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })} className={input}>
          <option value="trial">Essai (14 j)</option>
          <option value="paid">Payante (365 j)</option>
          <option value="lifetime">À vie</option>
        </select>
        <input type="number" min={1} max={200} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} className={input} aria-label="Nombre de clés" />
        <input type="number" min={1} max={36500} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="Durée en jours (défaut)" className={input} />
        <input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note (client…)" className={input} />
        <button disabled={busy} className="rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">{busy ? '…' : 'Générer'}</button>
      </form>

      {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}

      <form onSubmit={offlineCode} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-neutral-900">Activation hors-ligne (client sans Internet)</h2>
        <p className="text-xs text-neutral-500">Pas besoin de magasin : le client lit l'ID de son poste sur l'écran d'activation. Collez-le ici. Laissez « clé » vide pour en créer une nouvelle (type et durée ci-dessous), ou collez une clé existante. Le code obtenu s'entre sur le poste, sans connexion, et la clé est liée à ce poste.</p>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
          <input dir="ltr" value={offline.deviceId} onChange={(e) => setOffline({ ...offline, deviceId: e.target.value, code: '' })} placeholder="ID du poste" className={`${input} font-mono`} required />
          <input dir="ltr" value={offline.key} onChange={(e) => setOffline({ ...offline, key: e.target.value, code: '' })} placeholder="Clé existante (optionnel)" className={`${input} font-mono`} />
          <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700">{busy ? '…' : 'Générer le code'}</button>
        </div>
        {!offline.key.trim() && (
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={offline.kind} onChange={(e) => setOffline({ ...offline, kind: e.target.value as Kind, code: '' })} className={input}>
              <option value="trial">Essai (14 j)</option><option value="paid">Payante (365 j)</option><option value="lifetime">À vie</option>
            </select>
            <input type="number" min={1} max={36500} value={offline.durationDays} onChange={(e) => setOffline({ ...offline, durationDays: e.target.value, code: '' })} placeholder="Durée en jours (défaut)" className={input} />
            <input value={offline.note} maxLength={200} onChange={(e) => setOffline({ ...offline, note: e.target.value })} placeholder="Note (client…)" className={input} />
          </div>
        )}
        {offline.code && (
          <div className="rounded-xl bg-green-50 p-3 ring-1 ring-green-200">
            <div className="mb-1 flex justify-between text-sm font-medium text-green-900"><span>Code d'activation{offline.usedKey ? ` · clé ${offline.usedKey}` : ''}</span><button type="button" onClick={() => void navigator.clipboard?.writeText(offline.code)} className="underline underline-offset-2">Copier</button></div>
            <code dir="ltr" className="block select-all break-all font-mono text-xs text-green-900">{offline.code}</code>
          </div>
        )}
      </form>

      {fresh.length > 0 && (
        <div className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
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

      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full text-start text-sm">
          <thead className="bg-black/[0.03] text-xs text-neutral-600">
            <tr>{['Clé', 'Type', 'État', 'Magasin', 'Activée', 'Expire', 'Note', ''].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.key} className="border-t border-black/[0.06] transition hover:bg-black/[0.02]">
                <td dir="ltr" className="select-all px-4 py-3 font-mono text-xs">{k.key}</td>
                <td className="px-4 py-3">{k.kind === 'lifetime' ? 'À vie' : k.kind === 'paid' ? 'Payante' : 'Essai'} · {k.durationDays} j</td>
                <td className="px-4 py-3">{stateOf(k)}{k.redeemedAt && !k.revoked && !k.boundTo ? ' (déliée)' : ''}</td>
                <td className="px-4 py-3"><TenantPicker token={token} current={k.assignedTenantName} disabled={k.revoked} onPick={(id) => void assign(k.key, id)} /></td>
                <td className="px-4 py-3">{fmt(k.redeemedAt)}</td>
                <td className="px-4 py-3">{fmt(k.expiresAt)}</td>
                <td className="px-4 py-3 text-neutral-500">{k.note ?? ''}</td>
                <td className="space-x-3 whitespace-nowrap px-4 py-3 text-end">
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
        {current ?? <span className="text-neutral-400">Attribuer</span>}
      </button>
    );
  }
  return (
    <div className="relative">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} placeholder="Nom du magasin…"
        className="w-44 rounded-lg border border-transparent bg-black/[0.05] px-2.5 py-1.5 text-sm focus:bg-white" />
      <ul className="absolute z-10 mt-1 max-h-56 w-56 overflow-auto sheet rounded-xl bg-white p-1 shadow-popover ring-1 ring-neutral-200">
        {current && <li><button className="w-full px-3 py-1.5 text-start text-red-600 hover:bg-black/[0.05] rounded-lg" onClick={() => { setOpen(false); onPick(null); }}>Retirer l'attribution</button></li>}
        {opts.map((t) => (
          <li key={t.id}><button className="w-full px-3 py-1.5 text-start hover:bg-black/[0.05] rounded-lg" onClick={() => { setOpen(false); onPick(t.id); }}>{t.name} <span className="text-xs text-neutral-400">{t.slug}</span></button></li>
        ))}
        {opts.length === 0 && <li className="px-4 py-3 text-neutral-400">Aucun résultat</li>}
        <li><button className="w-full border-t border-black/[0.06] px-3 py-1.5 text-start text-neutral-500 hover:bg-black/[0.05] rounded-lg" onClick={() => setOpen(false)}>Annuler</button></li>
      </ul>
    </div>
  );
}

/** Sélecteur de magasin avec recherche par nom (obligatoire avant d'émettre une clé). */
function StoreSelect({ token, value, onChange, className }: { token: string; value: TenantOpt | null; onChange: (t: TenantOpt | null) => void; className: string }) {
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

  return (
    <div className="relative">
      {open ? (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} placeholder="Nom du magasin…" className={`${className} w-full`} />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${className} w-full text-start ${value ? '' : 'text-neutral-400'}`}>{value ? value.name : 'Magasin (obligatoire)'}</button>
      )}
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full min-w-56 overflow-auto sheet rounded-xl bg-white p-1 shadow-popover ring-1 ring-neutral-200">
          {opts.map((t) => (
            <li key={t.id}><button type="button" className="w-full px-3 py-1.5 text-start hover:bg-black/[0.05] rounded-lg" onClick={() => { onChange(t); setOpen(false); setQ(''); }}>{t.name} <span className="text-xs text-neutral-400">{t.slug}</span></button></li>
          ))}
          {opts.length === 0 && <li className="px-4 py-3 text-neutral-400">Aucun résultat</li>}
        </ul>
      )}
    </div>
  );
}
