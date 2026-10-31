import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { JwtClaims, UserRole } from '@pos-dz/shared';
import type { Db } from './db';
import type { CloudSync } from './cloud';

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
    const user = db.prepare('SELECT active FROM users WHERE id = ? AND tenant_id = ?').get(req.auth.sub, req.auth.tenantId) as { active: number } | undefined;
    if (!user?.active) return res.status(401).json({ error: 'Compte désactivé ou introuvable.' });
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

/** Échappe % et _ pour une recherche LIKE littérale. */
export const likePattern = (s: string) => `%${s.trim().replace(/[\\%_]/g, '\\$&')}%`;
export const bool = (v: unknown) => (v ? 1 : 0);
