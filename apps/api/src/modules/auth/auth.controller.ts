import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { loginCashierWithPassword, loginWithPassword, loginWithPin, signupTenant } from './auth.service';

export const authRouter = Router();

/** Premier lancement : crée le commerce (tenant) et son premier compte administrateur. */
authRouter.post('/setup', asyncHandler(async (req: Request, res: Response) => {
  const { businessName, adminName, email, password, phone, syncEnabled } = req.body ?? {};
  if (!businessName || !adminName || !email || !password) {
    return res.status(400).json({ error: 'businessName, adminName, email et password sont requis.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const result = await signupTenant({ businessName, adminName, email, password, phone, syncEnabled });
  res.status(201).json(result);
}));

authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, email, password } = req.body ?? {};
  if (!tenantId || !email || !password) {
    return res.status(400).json({ error: 'tenantId, email et password sont requis.' });
  }

  const result = await loginWithPassword(tenantId, email, password);
  if (!result) return res.status(401).json({ error: 'Identifiants invalides.' });
  res.json(result);
}));

/** Login caisse par email + mot de passe — alternative au PIN, réservée aux comptes cashier. */
authRouter.post('/login-cashier', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, email, password } = req.body ?? {};
  if (!tenantId || !email || !password) {
    return res.status(400).json({ error: 'tenantId, email et password sont requis.' });
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
