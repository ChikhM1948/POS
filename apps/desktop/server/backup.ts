import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './db';
import { HttpError, nowIso } from './util';

/**
 * Sauvegardes automatiques de la base SQLite vers un dossier choisi (clé USB, disque externe, ou
 * dossier synchronisé par un service cloud : Google Drive, OneDrive, Dropbox…), et restauration.
 *
 * - La copie utilise l'API de sauvegarde en ligne de SQLite : cohérente même pendant une vente.
 * - Les identifiants de la synchro en ligne (mot de passe, jeton) ne sont JAMAIS écrits dans la copie.
 * - La restauration est "préparée" (copie validée à côté de la base) puis appliquée au prochain
 *   démarrage, avant l'ouverture de la base : on ne remplace jamais un fichier SQLite ouvert.
 */

export interface BackupConfig {
  enabled: boolean;
  dir: string;
  intervalHours: number;
  keep: number;
}

export interface BackupFile {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackupStatus {
  config: BackupConfig;
  running: boolean;
  lastBackupAt?: string;
  lastError?: string;
  /** Dossier de destination accessible en ce moment (clé USB branchée ?). */
  destinationAvailable: boolean;
  backups: BackupFile[];
}

const DEFAULT_CONFIG: BackupConfig = { enabled: false, dir: '', intervalHours: 6, keep: 14 };
const TICK_MS = 5 * 60_000;
const FILE_RE = /^pos-backup-\d{8}-\d{6}\.sqlite$/;
const RESTORE_SUFFIX = '.restore';
/** Lignes app_meta propres à ce poste, reprises de la base courante lors d'une restauration. */
const KEEP_ON_RESTORE = ['jwt_secret', 'cloud_url', 'cloud_email', 'cloud_password', 'cloud_token', 'backup_config'];
const SECRET_KEYS = ['cloud_password', 'cloud_token'];
const REQUIRED_TABLES = ['tenants', 'users', 'products', 'sales', 'stock_movements', 'app_meta'];

const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** À appeler avant d'ouvrir la base : applique une restauration préparée lors de la session précédente. */
export function applyPendingRestore(dbFile: string): boolean {
  const staged = dbFile + RESTORE_SUFFIX;
  if (!fs.existsSync(staged)) return false;
  for (const ext of ['-wal', '-shm']) fs.rmSync(dbFile + ext, { force: true });
  fs.renameSync(staged, dbFile);
  return true;
}

export class BackupManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private db: Db,
    private dbFile: string,
    private nativeBinding: string | undefined,
    private requestRestart: () => void,
  ) {}

  private open(file: string, readonly = false) {
    return new Database(file, { readonly, ...(this.nativeBinding ? { nativeBinding: this.nativeBinding } : {}) });
  }
  private getMeta(key: string) {
    return (this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined)?.value;
  }
  private setMeta(key: string, value: string | undefined) {
    if (value === undefined) this.db.prepare('DELETE FROM app_meta WHERE key = ?').run(key);
    else this.db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  config(): BackupConfig {
    const raw = this.getMeta('backup_config');
    return { ...DEFAULT_CONFIG, ...(raw ? JSON.parse(raw) : {}) };
  }

  setConfig(input: Partial<BackupConfig>): BackupConfig {
    const next: BackupConfig = { ...this.config() };
    if (input.dir !== undefined) next.dir = String(input.dir).trim();
    if (input.enabled !== undefined) next.enabled = Boolean(input.enabled);
    if (input.intervalHours !== undefined) next.intervalHours = Math.min(168, Math.max(1, Math.round(Number(input.intervalHours)) || DEFAULT_CONFIG.intervalHours));
    if (input.keep !== undefined) next.keep = Math.min(365, Math.max(1, Math.round(Number(input.keep)) || DEFAULT_CONFIG.keep));
    if (next.enabled && !next.dir) throw new HttpError(400, 'Choisissez un dossier de sauvegarde.');
    if (next.enabled && !path.isAbsolute(next.dir)) throw new HttpError(400, 'Le dossier de sauvegarde doit être un chemin absolu.');
    this.setMeta('backup_config', JSON.stringify(next));
    if (next.enabled) void this.tick(); // première sauvegarde sans attendre
    return next;
  }

  start() {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    setTimeout(() => void this.tick(), 15_000); // laisse l'application finir de démarrer
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    const cfg = this.config();
    if (!cfg.enabled || !cfg.dir || this.running) return;
    const last = this.getMeta('backup_last_at');
    if (last && Date.now() - new Date(last).getTime() < cfg.intervalHours * 3_600_000) return;
    try {
      await this.runBackup();
    } catch {
      /* déjà consigné dans backup_last_error ; nouvel essai au prochain cycle (ex. clé USB absente) */
    }
  }

  list(dir = this.config().dir): BackupFile[] {
    if (!dir) return [];
    try {
      return fs
        .readdirSync(dir)
        .filter((n) => FILE_RE.test(n))
        .map((name) => {
          const p = path.join(dir, name);
          const st = fs.statSync(p);
          return { name, path: p, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
    } catch {
      return [];
    }
  }

  status(): BackupStatus {
    const config = this.config();
    let destinationAvailable = false;
    if (config.dir) {
      try {
        fs.accessSync(config.dir, fs.constants.W_OK);
        destinationAvailable = true;
      } catch {
        /* dossier absent ou en lecture seule */
      }
    }
    return {
      config,
      running: this.running,
      lastBackupAt: this.getMeta('backup_last_at'),
      lastError: this.getMeta('backup_last_error'),
      destinationAvailable,
      backups: this.list(),
    };
  }

  /** Crée une sauvegarde maintenant. */
  async runBackup(): Promise<BackupFile> {
    const cfg = this.config();
    if (!cfg.dir) throw new HttpError(400, 'Choisissez un dossier de sauvegarde.');
    if (this.running) throw new HttpError(409, 'Une sauvegarde est déjà en cours.');
    this.running = true;
    const name = `pos-backup-${stamp()}.sqlite`;
    const finalPath = path.join(cfg.dir, name);
    const tmpPath = path.join(cfg.dir, `.${name}.tmp`);
    try {
      try {
        fs.mkdirSync(cfg.dir, { recursive: true });
        fs.accessSync(cfg.dir, fs.constants.W_OK);
      } catch {
        throw new HttpError(400, `Dossier de sauvegarde inaccessible : ${cfg.dir} (clé USB débranchée ?)`);
      }
      await this.db.backup(tmpPath);
      const copy = this.open(tmpPath);
      try {
        const check = copy.pragma('integrity_check', { simple: true });
        if (check !== 'ok') throw new Error(`Copie corrompue (${check}).`);
        for (const k of SECRET_KEYS) copy.prepare('DELETE FROM app_meta WHERE key = ?').run(k);
        copy.pragma('journal_mode = DELETE'); // un seul fichier, sans -wal à copier avec
      } finally {
        copy.close();
      }
      fs.renameSync(tmpPath, finalPath);
      this.prune(cfg);
      this.setMeta('backup_last_at', nowIso());
      this.setMeta('backup_last_error', undefined);
      const st = fs.statSync(finalPath);
      return { name, path: finalPath, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    } catch (err) {
      fs.rmSync(tmpPath, { force: true });
      const message = err instanceof Error ? err.message : String(err);
      this.setMeta('backup_last_error', message);
      throw err instanceof HttpError ? err : new HttpError(500, message);
    } finally {
      this.running = false;
    }
  }

  private prune(cfg: BackupConfig) {
    for (const old of this.list(cfg.dir).slice(cfg.keep)) fs.rmSync(old.path, { force: true });
  }

  /** Vérifie qu'un fichier est bien une sauvegarde POS exploitable. */
  private validate(file: string) {
    if (!path.isAbsolute(file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new HttpError(400, 'Fichier de sauvegarde introuvable.');
    }
    let src: Database.Database | undefined;
    try {
      src = this.open(file, true);
      if (src.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('corrompu');
      const tables = new Set((src.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name));
      const missing = REQUIRED_TABLES.filter((t) => !tables.has(t));
      if (missing.length) throw new Error(`tables manquantes : ${missing.join(', ')}`);
    } catch (err) {
      throw new HttpError(400, `Ce fichier n'est pas une sauvegarde valide (${err instanceof Error ? err.message : err}).`);
    } finally {
      src?.close();
    }
  }

  /**
   * Prépare la restauration puis demande un redémarrage. Une copie de sécurité de l'état actuel est
   * d'abord enregistrée dans `pre-restore/` : une restauration par erreur reste réversible.
   */
  async restore(file: string): Promise<void> {
    this.validate(file);
    if (this.running) throw new HttpError(409, 'Une sauvegarde est en cours.');

    const safetyDir = path.join(path.dirname(this.dbFile), 'pre-restore');
    fs.mkdirSync(safetyDir, { recursive: true });
    await this.db.backup(path.join(safetyDir, `pos-before-restore-${stamp()}.sqlite`));
    const olds = fs.readdirSync(safetyDir).filter((n) => n.endsWith('.sqlite')).sort().reverse();
    for (const n of olds.slice(5)) fs.rmSync(path.join(safetyDir, n), { force: true });

    const staged = this.dbFile + RESTORE_SUFFIX;
    fs.rmSync(staged, { force: true });
    fs.copyFileSync(file, staged);
    const copy = this.open(staged);
    try {
      copy.pragma('journal_mode = DELETE');
      const put = copy.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
      const del = copy.prepare('DELETE FROM app_meta WHERE key = ?');
      for (const key of KEEP_ON_RESTORE) {
        const v = this.getMeta(key);
        if (v === undefined) del.run(key);
        else put.run(key, v);
      }
    } catch (err) {
      copy.close();
      fs.rmSync(staged, { force: true });
      throw err;
    }
    copy.close();
    setTimeout(() => this.requestRestart(), 600); // laisse la réponse HTTP partir avant de relancer
  }
}
