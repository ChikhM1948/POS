import { Router, Response } from 'express';
import { Types } from 'mongoose';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { Store } from '../../models/Store';
import type { StoreDTO } from '@pos-dz/shared';

export const storesRouter = Router();

storesRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const docs = await Store.find({ tenantId: new Types.ObjectId(req.auth!.tenantId), active: true }).sort({ name: 1 }).lean();
  const stores: StoreDTO[] = docs.map((s) => ({
    id: String(s._id),
    name: s.name,
    code: s.code,
    address: s.address,
    isMainStore: s.isMainStore,
    active: s.active,
  }));
  res.json({ stores });
}));
