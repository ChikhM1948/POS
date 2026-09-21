import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listProducts, createProduct, updateProduct, deactivateProduct } from './products.service';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const products = await listProducts(req.auth!.tenantId, search);
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
    const found = await deactivateProduct(req.auth!.tenantId, req.params.id);
    if (!found) return res.status(404).json({ error: 'Produit introuvable.' });
    res.status(204).send();
  }),
);
