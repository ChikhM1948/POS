'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';

interface BackupFile {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}
interface BackupStatus {
  config: { enabled: boolean; dir: string; intervalHours: number; keep: number };
  running: boolean;
  lastBackupAt?: string;
  lastError?: string;
  destinationAvailable: boolean;
  backups: BackupFile[];
}

const fmtSize = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Poste installé uniquement : sauvegarde automatique de la base vers USB / dossier cloud, et restauration en un clic. */
export function BackupPanel() {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [dir, setDir] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [intervalHours, setIntervalHours] = useState(6);
  const [keep, setKeep] = useState(14);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((s: BackupStatus, resetForm: boolean) => {
    setStatus(s);
    if (resetForm) {
      setDir(s.config.dir);
      setEnabled(s.config.enabled);
      setIntervalHours(s.config.intervalHours);
      setKeep(s.config.keep);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      apply(await adminFetch<BackupStatus>(session.token, '/backup'), false);
    } catch {
      /* indisponible : nouvel essai au prochain cycle */
    }
  }, [session, apply]);

  useEffect(() => {
    if (!session) return;
    adminFetch<BackupStatus>(session.token, '/backup').then((s) => apply(s, true), () => undefined);
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [session, apply, refresh]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if (!session) return;
      await adminFetch(session.token, '/backup/config', { method: 'PUT', body: JSON.stringify({ dir, enabled, intervalHours, keep }) });
      apply(await adminFetch<BackupStatus>(session.token, '/backup'), true);
    });

  const backupNow = () =>
    run(async () => {
      if (!session) return;
      apply(await adminFetch<BackupStatus>(session.token, '/backup/run', { method: 'POST' }), false);
    });

  async function restore(file: string) {
    if (!session || !window.confirm(t('backup.restoreConfirm'))) return;
    await run(async () => {
      await adminFetch(session.token, '/backup/restore', { method: 'POST', body: JSON.stringify({ file }) });
      setRestoring(true); // l'application se relance d'elle-même
    });
  }

  async function pickFolder() {
    const picked = await window.posBridge?.pickBackupFolder?.();
    if (picked) setDir(picked);
  }
  async function pickFile() {
    const picked = await window.posBridge?.pickBackupFile?.();
    if (picked) await restore(picked);
  }

  const input = 'rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500';
  const btnPrimary = 'rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-50';
  const btnGhost = 'rounded-lg border border-neutral-300 px-4 py-2 font-semibold text-neutral-700 disabled:opacity-50';
  const canPick = typeof window !== 'undefined' && Boolean(window.posBridge?.pickBackupFolder);

  if (restoring) {
    return (
      <section className="max-w-xl rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        {t('backup.restoring')}
      </section>
    );
  }

  return (
    <section className="flex max-w-xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
      <h2 className="text-lg font-semibold text-neutral-900">{t('backup.title')}</h2>
      <p className="text-neutral-500">{t('backup.intro')}</p>

      <label className="flex flex-col gap-1 text-neutral-700">
        {t('backup.folder')}
        <div className="flex gap-2">
          <input dir="ltr" value={dir} onChange={(e) => setDir(e.target.value)} placeholder={t('backup.folderPlaceholder')} className={`${input} flex-1`} />
          {canPick && (
            <button type="button" onClick={pickFolder} className={btnGhost}>
              {t('backup.choose')}
            </button>
          )}
        </div>
      </label>
      {status && dir && dir === status.config.dir && (
        <p className={status.destinationAvailable ? 'text-green-700' : 'text-amber-600'}>
          {status.destinationAvailable ? t('backup.available') : t('backup.unavailable')}
        </p>
      )}

      <label className="flex items-center gap-2 text-neutral-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t('backup.auto')}
      </label>
      <div className="flex flex-wrap items-center gap-3 text-neutral-700">
        <label className="flex items-center gap-2">
          {t('backup.every')}
          <input type="number" min={1} max={168} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className={`${input} w-20`} />
          {t('backup.hours')}
        </label>
        <label className="flex items-center gap-2">
          {t('backup.keep')}
          <input type="number" min={1} max={365} value={keep} onChange={(e) => setKeep(Number(e.target.value))} className={`${input} w-20`} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={save} className={btnPrimary}>{t('backup.save')}</button>
        <button disabled={busy || status?.running || !status?.config.dir} onClick={backupNow} className={btnGhost}>
          {busy || status?.running ? t('backup.working') : t('backup.backupNow')}
        </button>
      </div>

      <p className="text-neutral-700">
        {t('backup.lastBackup')} : <b>{status?.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : t('backup.never')}</b>
      </p>
      {status?.lastError && <p className="text-red-600">{t('backup.errorPrefix')} : {status.lastError}</p>}
      {error && <p className="text-red-600">{error}</p>}
      <p className="text-xs text-neutral-500">{t('backup.secretsNote')}</p>

      <h3 className="mt-2 font-semibold text-neutral-900">{t('backup.history')}</h3>
      {status && status.backups.length === 0 ? (
        <p className="text-neutral-500">{t('backup.noBackups')}</p>
      ) : (
        <ul className="flex max-h-64 flex-col divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {status?.backups.map((b) => (
            <li key={b.name} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-neutral-700">
                {new Date(b.createdAt).toLocaleString()} <span className="text-neutral-400">· {fmtSize(b.sizeBytes)}</span>
              </span>
              <button disabled={busy} onClick={() => restore(b.path)} className="rounded-lg border border-neutral-300 px-3 py-1 font-semibold text-neutral-700 disabled:opacity-50">
                {t('backup.restore')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {canPick && (
        <button disabled={busy} onClick={pickFile} className={`${btnGhost} self-start`}>
          {t('backup.restoreFromFile')}
        </button>
      )}
    </section>
  );
}
