import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { JwtClaims, UserRole } from '@pos-dz/shared';
import type { Db } from './db';
import type { CloudSync } from './cloud';
import type { BackupManager } from './backup';
import type { LicenseManager } from './license';
import { PERMISSION_VIEW_PURCHASE_PRICE } from './constants';

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();
export const toIso = (v: string | Date) => new Date(v).toISOString();

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Ctx {
  db: Db;
  jwtSecret: string;
  cloud: CloudSync;
  backup: BackupManager;
  license: LicenseManager;
}

export interface AuthedRequest extends Request {
  auth?: JwtClaims;
}

export function handler(fn: (req: AuthedRequest, res: Response) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req as AuthedRequest, res))
      .catch((err) => {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
        next(err);
      });
  };
}

export function requireAuth(secret: string, db: Db) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentification requise.' });
    try {
      req.auth = jwt.verify(header.slice(7), secret) as JwtClaims;
    } catch {
      return res.status(401).json({ error: 'Token invalide.' });
    }
    // Les tokens n'expirent pas : un compte supprimé ou désactivé perd l'accès immédiatement.
    const user = db.prepare('SELECT active, token_version, role, store_id, permissions FROM users WHERE id = ? AND tenant_id = ?').get(req.auth.sub, req.auth.tenantId) as { active: number; token_version: number; role: UserRole; store_id: string | null; permissions: string } | undefined;
    if (!user?.active) return res.status(401).json({ error: 'Compte désactivé ou introuvable.' });
    if (user.token_version !== (req.auth.tv ?? 0)) return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
    req.auth = { ...req.auth, role: user.role, storeId: user.store_id ?? undefined, canViewPurchasePrice: JSON.parse(user.permissions).includes(PERMISSION_VIEW_PURCHASE_PRICE) };
    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Rôle insuffisant pour cette action.' });
    }
    next();
  };
}

/** 402 quand l'essai / la licence du poste est expiré — même contrat que l'API cloud (code LICENSE_EXPIRED). */
export function requireLicense(license: LicenseManager) {
  return (_req: AuthedRequest, res: Response, next: NextFunction) => {
    const status = license.status();
    if (status.expired) return res.status(402).json({ error: "Licence expirée. Saisissez une clé d'activation pour continuer.", code: 'LICENSE_EXPIRED', license: status });
    next();
  };
}

/** Échappe % et _ pour une recherche LIKE littérale. */
export const likePattern = (s: string) => `%${s.trim().replace(/[\\%_]/g, '\\$&')}%`;
export const bool = (v: unknown) => (v ? 1 : 0);
