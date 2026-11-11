import { createPublicKey, randomUUID, verify } from 'node:crypto';
import { LICENSE_RENEW_BELOW_DAYS, TRIAL_DAYS, type LicenseStatusDTO, type SignedLicense } from '@pos-dz/shared';
import type { Db } from './db';
import { HttpError } from './util';
import { netFetch } from './netfetch';

/**
 * Licence du poste (essai 14 jours ou clé payante). Le serveur signe la licence (Ed25519) ; le poste
 * la stocke et la vérifie HORS-LIGNE avec la clé publique embarquée au build (POS_LICENSE_PUBLIC_KEY).
 * Seule l'activation (échange de la clé) exige Internet ; ensuite l'application tourne sans.
 */

const DAY_MS = 86_400_000;
const CLOCK_SKEW_MS = 5 * 60_000;

/** Remplacé au build par esbuild (voir scripts/bundle.js) ; repli runtime pour le dev. */
const PUBLIC_KEY = (process.env.POS_LICENSE_PUBLIC_KEY ?? '').replace(/\\n/g, '\n');
/** Serveur de licences / mises à jour par défaut, fixé au build (POS_API_URL). */
export const DEFAULT_API_URL = (process.env.POS_API_URL ?? '').replace(/\/+$/, '');
/** Flux de mises à jour complet (peut être hébergé ailleurs que l'API, ex. CasaOS) ; sinon `<API>/updates`. */
export const DEFAULT_UPDATE_URL = (process.env.POS_UPDATE_URL ?? '').replace(/\/+$/, '');

export class LicenseManager {
  constructor(private db: Db, private cloudUrl: () => string | undefined) {}

  private getMeta(key: string): string | undefined {
    return (this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined)?.value;
  }
  private setMeta(key: string, value: string) {
    this.db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  deviceId(): string {
    let id = this.getMeta('device_id');
    if (!id) this.setMeta('device_id', (id = randomUUID()));
    return id;
  }

  private verifySignature(l: SignedLicense): boolean {
    if (!PUBLIC_KEY) return false;
    try {
      // Même ordre de champs que le serveur ; `validUntil` absent sur les licences émises avant l'introduction des baux.
      const payload = { key: l.key, kind: l.kind, activatedAt: l.activatedAt, expiresAt: l.expiresAt, ...(l.validUntil ? { validUntil: l.validUntil } : {}) };
      return verify(null, Buffer.from(JSON.stringify(payload)), createPublicKey(PUBLIC_KEY), Buffer.from(l.signature, 'base64'));
    } catch {
      return false;
    }
  }

  /** Licence stockée, ou undefined si absente / falsifiée (signature invalide). */
  current(): SignedLicense | undefined {
    const raw = this.getMeta('license');
    if (!raw) return undefined;
    try {
      const l = JSON.parse(raw) as SignedLicense;
      return this.verifySignature(l) ? l : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * L'horloge ne peut pas reculer : on mémorise le plus grand instant observé et on s'en sert
   * comme « maintenant » — remettre la date du PC en arrière ne prolonge donc pas l'essai.
   */
  private now(): number {
    const seen = Number(this.getMeta('license_last_seen') ?? 0);
    const now = Math.max(Date.now(), seen);
    if (now > seen + 60_000) this.setMeta('license_last_seen', String(now));
    return now;
  }

  /**
   * Essai gratuit sans clé : démarre à la création du compte du poste (une seule fois — jamais relancé).
   * Il est enregistré localement (pas de signature possible hors-ligne) ; l'horloge anti-recul de `now()`
   * empêche de le prolonger en changeant la date du PC, et le cloud le reprend tel quel à la synchronisation.
   */
  startTrial(): void {
    if (!this.getMeta('trial_started_at')) this.setMeta('trial_started_at', new Date(this.now()).toISOString());
  }

  /** Données d'essai à transmettre au cloud lors du rattachement (absent si le poste a une clé signée). */
  trialInfo(): { deviceId: string; startedAt: string } | undefined {
    const startedAt = this.getMeta('trial_started_at');
    return startedAt ? { deviceId: this.deviceId(), startedAt } : undefined;
  }

  private trialExpiry(): string | undefined {
    const started = this.getMeta('trial_started_at');
    const t = started ? new Date(started).getTime() : NaN;
    return Number.isNaN(t) ? undefined : new Date(t + TRIAL_DAYS * DAY_MS).toISOString();
  }

  /** Fin effective d'une licence signée : le bail (s'il existe) borne l'expiration réelle. */
  private signedEnd(l: SignedLicense): number {
    const term = new Date(l.expiresAt).getTime();
    return l.validUntil ? Math.min(term, new Date(l.validUntil).getTime()) : term;
  }

  status(): LicenseStatusDTO {
    const signed = this.current();
    const trialEnd = this.trialExpiry();
    const now = this.now();
    // Le serveur a refusé le renouvellement (clé révoquée / déliée) : verrouillé tant qu'une clé valide n'est pas saisie.
    if (signed && this.getMeta('license_denied') === signed.key) {
      return { activated: true, kind: signed.kind, expiresAt: signed.expiresAt, daysLeft: 0, expired: true, denied: true };
    }
    // La licence qui court le plus longtemps l'emporte : une clé activée pendant l'essai le remplace.
    const useTrial = trialEnd && (!signed || new Date(trialEnd).getTime() > this.signedEnd(signed));
    const kind = useTrial ? ('trial' as const) : signed?.kind;
    const expiresAt = useTrial ? trialEnd : signed?.expiresAt;
    if (!expiresAt) return { activated: false, expired: true };
    const ms = new Date(expiresAt).getTime() - now;
    const leaseLapsed = !useTrial && signed !== undefined && this.signedEnd(signed) <= now && ms > 0;
    return {
      activated: true, kind, expiresAt, daysLeft: Math.max(0, Math.ceil(ms / DAY_MS)),
      expired: ms <= 0 || leaseLapsed, ...(leaseLapsed ? { needsOnline: true } : {}),
    };
  }

  /**
   * Renouvelle le bail auprès du serveur. Appelé en arrière-plan (démarrage + toutes les quelques heures) ; sans
   * Internet il ne fait rien — le poste continue jusqu'à la fin du bail. `force` : bouton « Renouveler ».
   * Un refus explicite du serveur (404/409) verrouille le poste ; une erreur réseau ne le verrouille jamais.
   */
  async renew(force = false): Promise<LicenseStatusDTO> {
    const l = this.current();
    const base = this.cloudUrl() || DEFAULT_API_URL;
    if (!l || !base || !PUBLIC_KEY) return this.status();
    // Licence à vie : jamais bloquée hors-ligne ; on vérifie seulement (au plus une fois par jour, quand Internet est là)
    // qu'elle n'a pas été révoquée / déliée. Les autres licences renouvellent leur bail avant qu'il n'expire.
    const lastCheck = Number(this.getMeta('license_checked_at') ?? 0);
    const due = l.kind === 'lifetime'
      ? this.now() - lastCheck > DAY_MS
      : this.signedEnd(l) - this.now() <= LICENSE_RENEW_BELOW_DAYS * DAY_MS;
    if (!force && !due) return this.status();
    let res: Response;
    try {
      res = await netFetch(`${base}/license/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: l.key, deviceId: this.deviceId() }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      if (force) throw new HttpError(502, "Impossible de joindre le serveur de licences. Vérifiez la connexion Internet.");
      return this.status();
    }
    const data: any = await res.json().catch(() => ({}));
    if (res.ok || res.status === 404 || res.status === 409) this.setMeta('license_checked_at', String(this.now()));
    if (res.status === 404 || res.status === 409) {
      this.setMeta('license_denied', l.key);
      return this.status();
    }
    if (!res.ok) {
      if (force) throw new HttpError(502, data.error ?? `Renouvellement refusé (${res.status}).`);
      return this.status();
    }
    const fresh = data.license as SignedLicense;
    if (fresh && fresh.key === l.key && this.verifySignature(fresh)) {
      this.setMeta('license', JSON.stringify(fresh));
      this.setMeta('license_denied', ''); // renouvelé : plus de refus en cours
    }
    return this.status();
  }

  private timer: ReturnType<typeof setInterval> | null = null;
  start() {
    const tick = () => void this.renew().catch(() => undefined);
    this.timer = setInterval(tick, 6 * 3_600_000);
    setTimeout(tick, 10_000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Code d'activation hors-ligne (émis par l'éditeur pour l'ID de ce poste) : vérifié localement, sans Internet. */
  private activateOffline(code: string): LicenseStatusDTO {
    if (!PUBLIC_KEY) throw new HttpError(503, 'Clé publique de licence absente de cette version de l\'application.');
    let license: SignedLicense;
    try {
      license = JSON.parse(Buffer.from(code.slice('POSL1.'.length).replace(/\s+/g, ''), 'base64url').toString('utf8')) as SignedLicense;
    } catch {
      throw new HttpError(400, "Code d'activation illisible. Recopiez-le en entier.");
    }
    if (!license?.signature || !this.verifySignature(license)) throw new HttpError(400, "Code d'activation invalide.");
    const existing = this.current();
    if (!existing || new Date(license.expiresAt) >= new Date(existing.expiresAt)) {
      this.setMeta('license', JSON.stringify(license));
      this.setMeta('license_denied', '');
    }
    return this.status();
  }

  /** Échange une clé auprès du serveur (Internet requis) puis stocke la licence signée. */
  async activate(rawKey: string): Promise<LicenseStatusDTO> {
    const key = String(rawKey ?? '').trim();
    if (!key) throw new HttpError(400, "Clé d'activation requise.");
    if (key.startsWith('POSL1.')) return this.activateOffline(key);
    const base = this.cloudUrl() || DEFAULT_API_URL;
    if (!base) throw new HttpError(503, "Adresse du serveur de licences non configurée dans cette version de l'application.");
    if (!PUBLIC_KEY) throw new HttpError(503, 'Clé publique de licence absente de cette version de l\'application.');

    let res: Response;
    try {
      res = await netFetch(`${base}/license/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId: this.deviceId() }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new HttpError(502, "Impossible de joindre le serveur d'activation. Vérifiez la connexion Internet.");
    }
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status === 404 || res.status === 409 ? res.status : 502, data.error ?? `Activation refusée (${res.status}).`);

    const license = data.license as SignedLicense;
    if (!license || !this.verifySignature(license)) throw new HttpError(502, 'Licence reçue invalide (signature).');
    // Ne jamais raccourcir : une clé plus ancienne ne remplace pas une licence plus longue déjà en place.
    const existing = this.current();
    if (!existing || new Date(license.expiresAt) >= new Date(existing.expiresAt)) {
      this.setMeta('license', JSON.stringify(license));
      this.setMeta('license_denied', '');
    }
    return this.status();
  }
}
