'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';

interface CloudStatus {
  configured: boolean;
  url?: string;
  email?: string;
  running: boolean;
  pending: number;
  lastSyncAt?: string;
  lastError?: string;
}

/** Adresse du serveur en ligne figée à la construction (NEXT_PUBLIC_CLOUD_URL) : si définie, l'utilisateur ne la saisit pas. */
const DEFAULT_CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL ?? '';

/** Poste installé uniquement : relie la base locale à la base en ligne avec le même compte administrateur. */
export function CloudSyncPanel() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [url, setUrl] = useState(DEFAULT_CLOUD_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      setStatus(await adminFetch<CloudStatus>(session.token, '/cloud/status'));
    } catch {
      /* statut indisponible : on réessaie au prochain cycle */
    }
  }, [session]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function call(path: string, method: string, body?: object) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      setStatus(await adminFetch<CloudStatus>(session.token, path, { method, body: body ? JSON.stringify(body) : undefined }));
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleConnect(e: FormEvent) {
    e.preventDefault();
    call('/cloud/connect', 'POST', { url, email, password });
  }

  const input = 'rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500';
  const lastSync = status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : t('cloudSync.never');

  return (
    <section className="flex max-w-xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-neutral-900">{t('cloudSync.title')}</h2>
      <p className="text-sm text-neutral-500">{t('cloudSync.intro')}</p>

      {status?.configured ? (
        <div className="flex flex-col gap-2 text-sm text-neutral-700">
          <p>{t('cloudSync.connected')} <span className="font-mono">{status.url}</span> ({status.email})</p>
          <p>{t('cloudSync.pending')} : <b>{status.pending}</b> · {t('cloudSync.lastSync')} : {lastSync}</p>
          {status.lastError && <p className="text-red-600">{t('cloudSync.errorPrefix')} : {status.lastError}</p>}
          <div className="flex gap-2">
            <button disabled={busy || status.running} onClick={() => call('/cloud/sync', 'POST')} className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy || status.running ? t('cloudSync.syncing') : t('cloudSync.syncNow')}
            </button>
            <button disabled={busy} onClick={() => call('/cloud', 'DELETE')} className="rounded-lg border border-neutral-300 px-4 py-2 font-semibold text-neutral-700 disabled:opacity-50">
              {t('cloudSync.disconnect')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="flex flex-col gap-3 text-sm">
          {!DEFAULT_CLOUD_URL && (
            <label className="flex flex-col gap-1 text-neutral-700">{t('cloudSync.serverUrl')}
              <input required type="url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…onrender.com" className={input} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-neutral-700">{t('cloudSync.email')}
            <input required type="text" inputMode="email" autoComplete="username" autoCapitalize="none" dir="ltr" placeholder="email@exemple.dz / 0555 12 34 56" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-neutral-700">{t('cloudSync.password')}
            <input required type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </label>
          <p className="text-xs text-neutral-500">{t('cloudSync.passwordNote')}</p>
          {error && <p className="text-red-600">{error}</p>}
          <button disabled={busy} className="self-start rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {busy ? t('cloudSync.connecting') : t('cloudSync.connect')}
          </button>
        </form>
      )}
      {status?.configured && error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
