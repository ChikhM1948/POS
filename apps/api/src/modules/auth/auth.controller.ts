import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { User } from '../../models/User';
import { bootstrapTenant } from '../sync/replicate.service';
import { parseIdentifier } from '@pos-dz/shared';
import { loginCashierWithPassword, loginWithPassword, loginWithPin, signupTenant } from './auth.service';

export const authRouter = Router();

/** Premier lancement : crée le commerce (tenant) et son premier compte administrateur. */
authRouter.post('/setup', asyncHandler(async (req: Request, res: Response) => {
  const { businessName, adminName, email, password, phone, syncEnabled, activationKey } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email (ou téléphone) et password sont requis.' });
  }
  const identifier = parseIdentifier(email);
  if (!identifier) {
    return res.status(400).json({ error: 'Saisissez une adresse email ou un numéro de téléphone valide.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  if (!activationKey) {
    return res.status(400).json({ error: "Clé d'activation requise pour créer un commerce." });
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
  res.json(await bootstrapTenant({ tenant, store, user, licenseKey: license?.key, trial }));
}));

authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis.' });
  }

  const result = await loginWithPassword(tenantId, email, password);
  if (!result) return res.status(401).json({ error: 'Identifiants invalides.' });
  res.json(result);
}));

/** Login caisse par email + mot de passe — alternative au PIN, réservée aux comptes cashier. */
authRouter.post('/login-cashier', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis.' });
  }

  const result = await loginCashierWithPassword(tenantId, email, password);
  if (!result) return res.status(401).json({ error: 'Identifiants invalides.' });
  res.json(result);
}));

authRouter.post('/login-pin', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, storeId, pinCode } = req.body ?? {};
  if (!tenantId || !storeId || !pinCode) {
    return res.status(400).json({ error: 'tenantId, storeId et pinCode sont requis.' });
  }

  const result = await loginWithPin(tenantId, storeId, pinCode);
  if (!result) return res.status(401).json({ error: 'PIN invalide.' });
  res.json(result);
}));
