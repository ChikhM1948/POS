import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { listCustomers, createCustomer, updateCustomer, getCustomerLedger, recordCustomerPayment } from './customers.service';
import type { CreateCustomerInput, CreateLedgerPaymentInput, UpdateCustomerInput } from '@pos-dz/shared';

export const customersRouter = Router();

// Lecture ouverte à tout rôle authentifié (le caissier doit pouvoir choisir un client pour une
// vente à crédit) — mêmes règles que /products. L'écriture (fiche, dette, paiement) reste réservée
// aux admins, comme /sales et /reports dans server.ts : ce sont des données financières.
customersRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await listCustomers(req.auth!.tenantId, search);
  res.json({ customers });
}));

customersRouter.post(
  '/',
  requireRole('store_admin', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest & { body: CreateCustomerInput }, res: Response) => {
    if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Le nom du client est requis.' });
    const customer = await createCustomer(req.auth!.tenantId, req.body);
    res.status(201).json({ customer });
  }),
);

customersRouter.patch(
  '/:id',
  requireRole('store_admin', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest & { body: UpdateCustomerInput }, res: Response) => {
    const customer = await updateCustomer(req.auth!.tenantId, req.params.id, req.body);
    if (!customer) return res.status(404).json({ error: 'Client introuvable.' });
    res.json({ customer });
  }),
);

customersRouter.get(
  '/:id/ledger',
  requireRole('store_admin', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const entries = await getCustomerLedger(req.auth!.tenantId, req.params.id);
    res.json({ entries });
  }),
);

customersRouter.post(
  '/:id/payments',
  requireRole('store_admin', 'super_admin'),
  asyncHandler(async (req: AuthenticatedRequest & { body: CreateLedgerPaymentInput }, res: Response) => {
    const { amountCents } = req.body ?? {};
    if (typeof amountCents !== 'number' || amountCents <= 0) {
      return res.status(400).json({ error: 'amountCents doit être un montant positif.' });
    }
    const entry = await recordCustomerPayment(req.auth!.tenantId, req.params.id, req.body);
    res.status(201).json({ entry });
  }),
);
