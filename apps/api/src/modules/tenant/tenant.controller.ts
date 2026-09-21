import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getTenantSettings, updateTenantSettings } from './tenant.service';

export const tenantRouter = Router();

// Lecture ouverte à tous les rôles authentifiés (ex. afficher le logo côté caisse) ; l'écriture
// (logo, téléphone, couleurs) reste réservée aux admins du commerce.
tenantRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenant = await getTenantSettings(req.auth!.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Commerce introuvable.' });
  res.json({ tenant });
}));

tenantRouter.patch(
  '/',
  requireRole('store_admin', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenant = await updateTenantSettings(req.auth!.tenantId, req.body ?? {});
    if (!tenant) return res.status(404).json({ error: 'Commerce introuvable.' });
    res.json({ tenant });
  }),
);
