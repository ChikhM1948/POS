import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../../middleware/auth';
import { env } from '../../config/env';
import { activateForTenant, assignKeyToTenant, searchTenants, generateKeys, getTenantLicenseStatus, handleSofizpayCallback, listKeys, redeemKey, renewLease, resetKeyBinding, revokeKey, signLicense, startCheckout, verifyCheckout } from './license.service';
import { loginPlatformAdmin, requirePlatformAdmin } from './platformAdmin.service';

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
  await revokeKey(req.body?.key);
  res.json({ revoked: true });
}));

// --- Compte super admin (éditeur) : émission / suivi des clés depuis l'interface web ---

function parseGenerate(body: any) {
  const { count = 1, kind = 'trial', durationDays, note } = body ?? {};
  if (kind !== 'trial' && kind !== 'paid' && kind !== 'lifetime') throw Object.assign(new Error("kind doit valoir 'trial', 'paid' ou 'lifetime'."), { status: 400 });
  const days = durationDays ? Number(durationDays) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 36_500)) throw Object.assign(new Error('durationDays doit être un entier entre 1 et 36500.'), { status: 400 });
  return { count: Number(count) || 1, kind, days, note: typeof note === 'string' ? note.slice(0, 200) : undefined };
}

licenseRouter.post('/admin/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email et password sont requis.' });
  res.json(await loginPlatformAdmin(String(email), String(password), req.ip ?? ''));
}));

licenseRouter.get('/admin/keys', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { kind, state, q } = req.query as Record<string, string | undefined>;
  res.json({ keys: await listKeys({ kind, state, q }) });
}));

licenseRouter.post('/admin/generate', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { count, kind, days, note } = parseGenerate(req.body);
  res.status(201).json({ keys: await generateKeys(count, kind, days, note) });
}));

licenseRouter.get('/admin/tenants', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  res.json({ tenants: await searchTenants(typeof req.query.q === 'string' ? req.query.q : undefined) });
}));

licenseRouter.post('/admin/assign', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { key, tenantId } = req.body ?? {};
  await assignKeyToTenant(key, tenantId ? String(tenantId) : null);
  res.json({ assigned: !!tenantId });
}));

licenseRouter.post('/admin/reset-binding', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  await resetKeyBinding(req.body?.key);
  res.json({ reset: true });
}));

licenseRouter.post('/admin/revoke', requirePlatformAdmin, asyncHandler(async (req: Request, res: Response) => {
  await revokeKey(req.body?.key);
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

/** Poste desktop : renouvelle le bail de sa licence signée (appel périodique en arrière-plan). */
licenseRouter.post('/renew', asyncHandler(async (req: Request, res: Response) => {
  const { key, deviceId } = req.body ?? {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId requis.' });
  res.json({ license: signLicense(await renewLease(key, String(deviceId))) });
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
