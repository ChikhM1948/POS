import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth';
import { env } from '../../config/env';
import { License } from '../../models/License';
import { Tenant } from '../../models/Tenant';
import { activateForTenant, generateKeys, getTenantLicenseStatus, redeemKey, signLicense } from './license.service';

export const licenseRouter = Router();

function adminKeyOk(req: Request): boolean {
  const given = Buffer.from(String(req.headers['x-admin-key'] ?? ''));
  const expected = Buffer.from(env.licenseAdminKey ?? '');
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

/** Éditeur : émet des clés d'activation. Protégé par LICENSE_ADMIN_KEY (en-tête x-admin-key). */
licenseRouter.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  if (!adminKeyOk(req)) return res.status(403).json({ error: 'Accès refusé.' });
  const { count = 1, kind = 'trial', durationDays, note } = req.body ?? {};
  if (kind !== 'trial' && kind !== 'paid') return res.status(400).json({ error: "kind doit valoir 'trial' ou 'paid'." });
  res.status(201).json({ keys: await generateKeys(Number(count) || 1, kind, durationDays ? Number(durationDays) : undefined, note) });
}));

/** Éditeur : révoque une clé (le commerce concerné est bloqué à l'expiration du jeton de statut). */
licenseRouter.post('/revoke', asyncHandler(async (req: Request, res: Response) => {
  if (!adminKeyOk(req)) return res.status(403).json({ error: 'Accès refusé.' });
  const key = String(req.body?.key ?? '').trim().toUpperCase();
  const lic = await License.findOneAndUpdate({ key }, { revoked: true, expiresAt: new Date() }, { new: true });
  if (!lic) return res.status(404).json({ error: 'Clé introuvable.' });
  if (lic.tenantId) {
    await Tenant.updateOne({ _id: lic.tenantId, 'license.key': lic.key }, { $set: { 'license.expiresAt': lic.expiresAt } });
  }
  res.json({ revoked: true });
}));

/**
 * Poste desktop : échange une clé contre une licence signée, avant même que le commerce existe
 * dans le cloud. `deviceId` lie la clé à ce poste (réutilisable par lui seul, ex. après réinstallation).
 */
licenseRouter.post('/redeem', asyncHandler(async (req: Request, res: Response) => {
  const { key, deviceId } = req.body ?? {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId requis.' });
  const lic = await redeemKey(key, `device:${deviceId}`);
  res.json({ license: signLicense(lic) });
}));

/** Statut de la licence du commerce authentifié. */
licenseRouter.get('/status', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.json({ license: await getTenantLicenseStatus(req.auth!.tenantId) });
}));

/** Active ou prolonge la licence du commerce (admin) avec une nouvelle clé. */
licenseRouter.post('/activate', requireAuth, requireRole('store_admin', 'super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.json({ license: await activateForTenant(req.auth!.tenantId, req.body?.key) });
}));
