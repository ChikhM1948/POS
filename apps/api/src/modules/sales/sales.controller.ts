import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listSales, getSaleById, createRefund, RefundValidationError } from './sales.service';
import type { CreateRefundInput } from '@pos-dz/shared';

export const salesRouter = Router();

salesRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, from, to, search, page, limit } = req.query as Record<string, string | undefined>;

  const { sales, total } = await listSales(req.auth!.tenantId, {
    storeId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    search,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  res.json({ sales, total });
}));

salesRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sale = await getSaleById(req.auth!.tenantId, req.params.id);
  if (!sale) return res.status(404).json({ error: 'Vente introuvable.' });
  res.json({ sale });
}));

salesRouter.post('/:id/refund', asyncHandler(async (req: AuthenticatedRequest & { body: CreateRefundInput }, res: Response) => {
  try {
    const refund = await createRefund(req.auth!.tenantId, req.params.id, req.auth!.sub, req.body);
    res.status(201).json({ sale: refund });
  } catch (err) {
    if (err instanceof RefundValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
}));
