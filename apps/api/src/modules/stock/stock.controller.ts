import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getStockBalances, getMovementHistory, createManualMovement } from './stock.service';
import type { CreateStockMovementInput } from '@pos-dz/shared';

export const stockRouter = Router();

stockRouter.get('/balances', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId } = req.query as { storeId?: string };
  if (!storeId) return res.status(400).json({ error: 'storeId est requis.' });

  const balances = await getStockBalances(req.auth!.tenantId, storeId);
  res.json({ balances });
}));

stockRouter.get('/movements', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, productId } = req.query as { storeId?: string; productId?: string };
  if (!storeId || !productId) return res.status(400).json({ error: 'storeId et productId sont requis.' });

  const movements = await getMovementHistory(req.auth!.tenantId, storeId, productId);
  res.json({ movements });
}));

stockRouter.post(
  '/movements',
  requireRole('store_admin', 'stock_manager', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest & { body: CreateStockMovementInput }, res: Response) => {
    const { productId, storeId, type, quantityDelta } = req.body;
    if (!productId || !storeId || !type || typeof quantityDelta !== 'number' || quantityDelta === 0) {
      return res.status(400).json({ error: 'productId, storeId, type et quantityDelta (non nul) sont requis.' });
    }

    const movement = await createManualMovement(req.auth!.tenantId, req.body);
    res.status(201).json({ movement });
  }),
);
