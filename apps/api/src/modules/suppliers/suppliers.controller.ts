import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listSuppliers, createSupplier, updateSupplier, getSupplierLedger, recordSupplierPayment } from './suppliers.service';
import type { CreateLedgerPaymentInput, SupplierInput } from '@pos-dz/shared';

export const suppliersRouter = Router();

// Gestion fournisseurs/dettes réservée aux rôles qui font les achats — mêmes rôles que /stock/purchases.
suppliersRouter.use(requireRole('store_admin', 'stock_manager', 'super_admin'));

suppliersRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const suppliers = await listSuppliers(req.auth!.tenantId);
  res.json({ suppliers });
}));

suppliersRouter.post('/', asyncHandler(async (req: AuthenticatedRequest & { body: SupplierInput }, res: Response) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Le nom du fournisseur est requis.' });
  const supplier = await createSupplier(req.auth!.tenantId, req.body);
  res.status(201).json({ supplier });
}));

suppliersRouter.patch('/:id', asyncHandler(async (req: AuthenticatedRequest & { body: Partial<SupplierInput> }, res: Response) => {
  const supplier = await updateSupplier(req.auth!.tenantId, req.params.id, req.body);
  if (!supplier) return res.status(404).json({ error: 'Fournisseur introuvable.' });
  res.json({ supplier });
}));

suppliersRouter.get('/:id/ledger', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const entries = await getSupplierLedger(req.auth!.tenantId, req.params.id);
  res.json({ entries });
}));

suppliersRouter.post('/:id/payments', asyncHandler(async (req: AuthenticatedRequest & { body: CreateLedgerPaymentInput }, res: Response) => {
  const { amountCents } = req.body ?? {};
  if (typeof amountCents !== 'number' || amountCents <= 0) {
    return res.status(400).json({ error: 'amountCents doit être un montant positif.' });
  }
  const entry = await recordSupplierPayment(req.auth!.tenantId, req.params.id, req.body);
  res.status(201).json({ entry });
}));
