import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listProducts, createProduct, updateProduct, deactivateProduct, deleteProductPermanently } from './products.service';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  // Tout rôle authentifié peut lister les produits (nécessaire au checkout caisse) — seul le prix
  // d'achat est restreint, voir PERMISSION_VIEW_PURCHASE_PRICE et toDTO() dans products.service.ts.
  const canViewPurchasePrice = req.auth!.role !== 'cashier' || Boolean(req.auth!.canViewPurchasePrice);
  const products = await listProducts(req.auth!.tenantId, search, canViewPurchasePrice);
  res.json({ products });
}));

productsRouter.post(
  '/',
  requireRole('store_admin', 'stock_manager', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const product = await createProduct(req.auth!.tenantId, req.body);
    res.status(201).json({ product });
  }),
);

productsRouter.patch(
  '/:id',
  requireRole('store_admin', 'stock_manager', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const product = await updateProduct(req.auth!.tenantId, req.params.id, req.body);
    if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
    res.json({ product });
  }),
);

productsRouter.delete(
  '/:id',
  requireRole('store_admin', 'stock_manager', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.query.permanent === 'true') {
      const result = await deleteProductPermanently(req.auth!.tenantId, req.params.id);
      if (result.status === 'not_found') return res.status(404).json({ error: 'Produit introuvable.' });
      if (result.status === 'blocked') {
        return res.status(409).json({
          error: 'Suppression impossible : ce produit apparaît dans l\'historique (ventes, documents ou mouvements de stock). Désactivez-le à la place.',
          reason: result.reason,
        });
      }
      return res.status(204).send();
    }
    const found = await deactivateProduct(req.auth!.tenantId, req.params.id);
    if (!found) return res.status(404).json({ error: 'Produit introuvable.' });
    res.status(204).send();
  }),
);
