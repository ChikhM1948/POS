import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth';
import { env } from '../../config/env';
import { License } from '../../models/License';
import { Tenant } from '../../models/Tenant';
import { activateForTenant, generateKeys, getTenantLicenseStatus, handleSofizpayCallback, redeemKey, signLicense, startCheckout, verifyCheckout } from './license.service';

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
  if (kind !== 'trial' && kind !== 'paid' && kind !== 'lifetime') return res.status(400).json({ error: "kind doit valoir 'trial', 'paid' ou 'lifetime'." });
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

/** Prix public de la licence à vie (affichage du bouton « Payer en ligne »). */
licenseRouter.get('/price', (_req: Request, res: Response) => {
  res.json({ lifetime: { amount: env.lifetimePriceDzd, currency: 'DZD' }, onlinePayment: !!env.sofizpayApiKey });
});

/** Paiement en ligne (SofizPay, CIB / Dahabia) d'une licence à vie pour le commerce authentifié. */
licenseRouter.post('/checkout', requireAuth, requireRole('store_admin', 'super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone } = req.body ?? {};
  res.status(201).json(await startCheckout(req.auth!.tenantId, { name, email, phone }));
}));

/** Retour de paiement : vérifie auprès de SofizPay et active la licence si payée. */
licenseRouter.get('/checkout/:orderId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.json(await verifyCheckout(req.auth!.tenantId, String(req.params.orderId)));
}));

/**
 * Callback SofizPay. SofizPay ne fournit ni secret ni signature : le corps n'est donc jamais cru, il sert
 * seulement à retrouver la commande ; le paiement est ensuite vérifié auprès de SofizPay (cib-transaction-check).
 */
licenseRouter.post('/sofizpay/webhook', asyncHandler(async (req: Request, res: Response) => {
  const orderId = String(req.body?.order_id ?? req.body?.orderId ?? '');
  if (orderId.startsWith('POS-')) await handleSofizpayCallback(orderId);
  res.json({ received: true });
}));
