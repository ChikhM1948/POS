import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { User } from '../../models/User';
import { bootstrapTenant } from '../sync/replicate.service';
import { parseIdentifier } from '@pos-dz/shared';
import { str, oid } from '../../middleware/sanitize';
import { loginCashierWithPassword, loginWithPassword, loginWithPin, signupTenant } from './auth.service';

export const authRouter = Router();

/** Premier lancement : crée le commerce (tenant) et son premier compte administrateur. */
authRouter.post('/setup', asyncHandler(async (req: Request, res: Response) => {
  const { syncEnabled } = req.body ?? {};
  const businessName = str(req.body?.businessName), adminName = str(req.body?.adminName), phone = str(req.body?.phone);
  const email = str(req.body?.email), password = str(req.body?.password), activationKey = str(req.body?.activationKey);
  if (!email || !password) {
    return res.status(400).json({ error: 'email (ou téléphone) et password sont requis.' });
  }
  const identifier = parseIdentifier(email);
  if (!identifier) {
    return res.status(400).json({ error: 'Saisissez une adresse email ou un numéro de téléphone valide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  if (await User.exists({ email: identifier.value }).setOptions({ skipTenantScope: true })) {
    return res.status(409).json({ error: identifier.kind === 'phone' ? 'Un compte existe déjà avec ce numéro de téléphone.' : 'Un compte existe déjà avec cet email.' });
  }

  const result = await signupTenant({ businessName, adminName, email: identifier.value, password, phone, syncEnabled, activationKey });
  res.status(201).json(result);
}));

/** Enregistrement d'un poste installé dans le cloud (voir replicate.service.ts) : sans effet si le commerce existe déjà. */
authRouter.post('/replicate-bootstrap', asyncHandler(async (req: Request, res: Response) => {
  const { tenant, store, user, license, trial } = req.body ?? {};
  if (!tenant?._id || !tenant?.slug || !store?._id || !user?._id || !user?.email || !user?.passwordHash) {
    return res.status(400).json({ error: 'tenant, store et user sont requis.' });
  }
  res.json(await bootstrapTenant({ tenant, store, user, licenseKey: str(license?.key), trial, ip: req.ip ?? '' }));
}));

authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const email = str(req.body?.email);
  const password = str(req.body?.password);
  const tenantId = oid(req.body?.tenantId);
  if (!email || !password || (req.body?.tenantId != null && !tenantId)) {
    return res.status(400).json({ error: 'email et password sont requis.' });
  }

  const result = await loginWithPassword(tenantId, email, password);
  if (!result) return res.status(401).json({ error: 'Identifiants invalides.' });
  res.json(result);
}));

/** Login caisse par email + mot de passe — alternative au PIN, réservée aux comptes cashier. */
authRouter.post('/login-cashier', asyncHandler(async (req: Request, res: Response) => {
  const email = str(req.body?.email);
  const password = str(req.body?.password);
  const tenantId = oid(req.body?.tenantId);
  if (!email || !password || (req.body?.tenantId != null && !tenantId)) {
    return res.status(400).json({ error: 'email et password sont requis.' });
  }

  const result = await loginCashierWithPassword(tenantId, email, password);
  if (!result) return res.status(401).json({ error: 'Identifiants invalides.' });
  res.json(result);
}));

authRouter.post('/login-pin', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = oid(req.body?.tenantId);
  const storeId = oid(req.body?.storeId);
  const pinCode = str(req.body?.pinCode);
  if (!tenantId || !storeId || !pinCode) {
    return res.status(400).json({ error: 'tenantId, storeId et pinCode sont requis.' });
  }

  const result = await loginWithPin(tenantId, storeId, pinCode);
  if (!result) return res.status(401).json({ error: 'PIN invalide.' });
  res.json(result);
}));
