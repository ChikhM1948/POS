import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtClaims, UserRole } from '@pos-dz/shared';

export interface AuthenticatedRequest extends Request {
  auth?: JwtClaims;
}

/** Vérifie le JWT et attache tenantId/storeId/role à la requête — toute route métier en dépend. */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const token = header.slice('Bearer '.length);
    req.auth = jwt.verify(token, env.jwtSecret) as JwtClaims;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Rôle insuffisant pour cette action.' });
    }
    next();
  };
}
