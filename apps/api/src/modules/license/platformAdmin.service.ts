import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { PlatformAdmin } from '../../models/PlatformAdmin';

/**
 * Secret distinct de celui des commerces : un JWT de commerce ne peut jamais passer pour un
 * super admin, et un JWT super admin (sans tenantId) ne peut jamais être accepté par requireAuth.
 */
const PLATFORM_SECRET = `${env.jwtSecret}:platform-admin`;
const SESSION_TTL = '8h';

export interface PlatformClaims { sub: string; scope: 'platform_admin' }
export interface PlatformRequest extends Request { platformAdmin?: PlatformClaims }

// Hash factice : on compare toujours, pour ne pas révéler par le temps de réponse si l'email existe.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Anti brute-force (en mémoire : suffisant par instance ; sur serverless c'est un frein, pas une garantie).
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const failures = new Map<string, { count: number; first: number }>();

function throttled(id: string): boolean {
  const f = failures.get(id);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW_MS) { failures.delete(id); return false; }
  return f.count >= MAX_FAILURES;
}
function noteFailure(id: string) {
  const f = failures.get(id);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(id, { count: 1, first: Date.now() });
  else f.count++;
}

export async function loginPlatformAdmin(email: string, password: string, ip: string) {
  const id = `${ip}|${email.toLowerCase()}`;
  if (throttled(id)) throw Object.assign(new Error('Trop de tentatives. Réessayez dans quelques minutes.'), { status: 429 });
  const admin = await PlatformAdmin.findOne({ email: email.trim().toLowerCase(), active: true });
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) {
    noteFailure(id);
    throw Object.assign(new Error('Identifiants invalides.'), { status: 401 });
  }
  failures.delete(id);
  const claims: PlatformClaims = { sub: String(admin._id), scope: 'platform_admin' };
  return { token: jwt.sign(claims, PLATFORM_SECRET, { expiresIn: SESSION_TTL }), admin: { name: admin.name, email: admin.email } };
}

/** Garde des routes /license/admin/* : exige un jeton super admin valide ET un compte toujours actif. */
export async function requirePlatformAdmin(req: PlatformRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentification requise.' });
  try {
    const claims = jwt.verify(header.slice(7), PLATFORM_SECRET, { algorithms: ['HS256'] }) as PlatformClaims;
    if (claims.scope !== 'platform_admin' || !(await PlatformAdmin.exists({ _id: claims.sub, active: true }))) throw new Error('revoked');
    req.platformAdmin = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Session super admin invalide ou expirée.' });
  }
}

/** Crée ou met à jour (mot de passe) un super admin — utilisé par le script `create-superadmin`. */
export async function upsertPlatformAdmin(email: string, password: string, name?: string) {
  const e = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await PlatformAdmin.findOne({ email: e });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.active = true;
    if (name) existing.name = name;
    await existing.save();
    return { created: false };
  }
  await PlatformAdmin.create({ email: e, name: name?.trim() || 'Super Admin', passwordHash });
  return { created: true };
}
