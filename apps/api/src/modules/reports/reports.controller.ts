import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { getSalesSummary, getTopProducts } from './reports.service';

export const reportsRouter = Router();

function parseRange(query: Record<string, string | undefined>) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { storeId: query.storeId, from, to };
}

reportsRouter.get('/summary', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const range = parseRange(req.query as Record<string, string | undefined>);
  const summary = await getSalesSummary(req.auth!.tenantId, range);
  res.json({ summary });
}));

reportsRouter.get('/top-products', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit, ...rest } = req.query as Record<string, string | undefined>;
  const range = parseRange(rest);
  const products = await getTopProducts(req.auth!.tenantId, range, limit ? parseInt(limit, 10) : undefined);
  res.json({ products });
}));
