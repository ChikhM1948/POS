import { createPublicKey, randomUUID, verify } from 'node:crypto';
import type { LicenseStatusDTO, SignedLicense } from '@pos-dz/shared';
import type { Db } from './db';
import { HttpError } from './util';

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
      const payload = { key: l.key, kind: l.kind, activatedAt: l.activatedAt, expiresAt: l.expiresAt };
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

  status(): LicenseStatusDTO {
    const l = this.current();
    if (!l) return { activated: false, expired: true };
    const ms = new Date(l.expiresAt).getTime() - this.now();
    return { activated: true, kind: l.kind, expiresAt: l.expiresAt, daysLeft: Math.max(0, Math.ceil(ms / DAY_MS)), expired: ms <= 0 };
  }

  /** Échange une clé auprès du serveur (Internet requis) puis stocke la licence signée. */
  async activate(rawKey: string): Promise<LicenseStatusDTO> {
    const key = String(rawKey ?? '').trim();
    if (!key) throw new HttpError(400, "Clé d'activation requise.");
    const base = this.cloudUrl() || DEFAULT_API_URL;
    if (!base) throw new HttpError(503, "Adresse du serveur de licences non configurée dans cette version de l'application.");
    if (!PUBLIC_KEY) throw new HttpError(503, 'Clé publique de licence absente de cette version de l\'application.');

    let res: Response;
    try {
      res = await fetch(`${base}/license/redeem`, {
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
    if (!existing || new Date(license.expiresAt) >= new Date(existing.expiresAt)) this.setMeta('license', JSON.stringify(license));
    return this.status();
  }
}
