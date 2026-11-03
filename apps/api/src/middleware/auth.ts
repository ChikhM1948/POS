import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { PERMISSION_VIEW_PURCHASE_PRICE } from '@pos-dz/shared';
import type { JwtClaims, UserRole } from '@pos-dz/shared';

export interface AuthenticatedRequest extends Request {
  auth?: JwtClaims;
}

// Cache court (par instance) pour ne pas interroger Mongo à chaque requête ; la révocation est donc effective
// immédiatement sur l'instance qui l'a émise et au plus ~15 s ailleurs (serverless multi-instances).
const CACHE_TTL_MS = 15_000;
const userCache = new Map<string, { at: number; user: { active: boolean; tokenVersion: number; role: UserRole; storeId?: string; canView: boolean } | null }>();

/** À appeler après tout changement de session d'un compte pour que la révocation soit immédiate sur cette instance. */
export function invalidateAuthCache(userId: string) {
  userCache.delete(userId);
}

async function loadUser(claims: JwtClaims) {
  const hit = userCache.get(claims.sub);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.user;
  const doc = Types.ObjectId.isValid(claims.sub) && Types.ObjectId.isValid(claims.tenantId)
    ? await User.findOne({ _id: claims.sub, tenantId: new Types.ObjectId(claims.tenantId) }).select('active tokenVersion role storeId permissions').lean()
    : null;
  const user = doc
    ? { active: doc.active !== false, tokenVersion: doc.tokenVersion ?? 0, role: doc.role, storeId: doc.storeId ? String(doc.storeId) : undefined, canView: Boolean(doc.permissions?.includes(PERMISSION_VIEW_PURCHASE_PRICE)) }
    : null;
  userCache.set(claims.sub, { at: Date.now(), user });
  if (userCache.size > 5000) userCache.clear();
  return user;
}

/**
 * Vérifie le JWT puis l'état du compte en base : compte supprimé/désactivé ou `tokenVersion` périmée => 401.
 * Rôle, boutique et droit « prix d'achat » viennent de la base, pas du jeton : une rétrogradation prend effet tout de suite.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  let claims: JwtClaims;
  try {
    claims = jwt.verify(header.slice('Bearer '.length), env.jwtSecret, { algorithms: ['HS256'] }) as JwtClaims;
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
  try {
    const user = await loadUser(claims);
    if (!user || !user.active || user.tokenVersion !== (claims.tv ?? 0)) {
      return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
    }
    req.auth = { ...claims, role: user.role, storeId: user.storeId ?? claims.storeId, canViewPurchasePrice: user.canView };
    next();
  } catch (err) {
    next(err);
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
