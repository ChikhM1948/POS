import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { User } from '../../models/User';
import { listUsers, createUser, updateUser, deactivateUser } from './users.service';
import type { CreateUserInput, UpdateUserInput } from '@pos-dz/shared';

export const usersRouter = Router();

// Provisionner l'équipe (caissiers/gestionnaires de stock) est réservé aux admins du commerce.
usersRouter.use(requireRole('store_admin', 'super_admin'));

usersRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const users = await listUsers(req.auth!.tenantId);
  res.json({ users });
}));

usersRouter.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, storeId, pinCode, canViewPurchasePrice } = (req.body ?? {}) as Partial<CreateUserInput>;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password et role sont requis.' });
  }
  if (!['cashier', 'stock_manager'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide — seuls caissier et gestionnaire de stock peuvent être créés ici.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  // Le PIN est l'unique moyen de connexion à la caisse (voir LoginForm côté POS, /auth/login-pin
  // côté API) — un caissier créé sans PIN ne pourrait jamais ouvrir de session de vente.
  if (role === 'cashier' && !pinCode) {
    return res.status(400).json({ error: 'Un code PIN est requis pour un compte caissier (utilisé pour se connecter à la caisse).' });
  }

  const existing = await User.findOne({ tenantId: req.auth!.tenantId, email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà.' });
  }

  const user = await createUser(req.auth!.tenantId, { name, email, password, role, storeId, pinCode, canViewPurchasePrice });
  res.status(201).json({ user });
}));

usersRouter.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await updateUser(req.auth!.tenantId, req.params.id, (req.body ?? {}) as UpdateUserInput);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user });
}));

usersRouter.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.params.id === req.auth!.sub) {
    return res.status(400).json({ error: 'Impossible de désactiver son propre compte.' });
  }
  const found = await deactivateUser(req.auth!.tenantId, req.params.id);
  if (!found) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.status(204).send();
}));
