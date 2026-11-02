import { Router, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { DocumentError } from '@pos-dz/shared';
import {
  cancelDocument,
  convertDocument,
  createDocument,
  createDocumentFromSale,
  getDocument,
  listDocuments,
} from './documents.service';

export const documentsRouter = Router();

/** Convertit les erreurs métier en réponse HTTP ; tout le reste retombe sur le filet d'erreur global (500). */
const documentHandler = (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  asyncHandler<AuthenticatedRequest>(async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof DocumentError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

documentsRouter.get('/', documentHandler(async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await listDocuments(req.auth!.tenantId, {
    kind: q.kind,
    status: q.status,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    search: q.search,
    saleId: q.saleId,
    page: q.page ? parseInt(q.page, 10) : undefined,
    limit: q.limit ? parseInt(q.limit, 10) : undefined,
  });
  res.json(result);
}));

documentsRouter.get('/:id', documentHandler(async (req, res) => {
  const document = await getDocument(req.auth!.tenantId, req.params.id);
  if (!document) return res.status(404).json({ error: 'Document introuvable.' });
  res.json({ document });
}));

documentsRouter.post('/', documentHandler(async (req, res) => {
  const document = await createDocument(req.auth!.tenantId, req.auth!.sub, req.body ?? {});
  res.status(201).json({ document });
}));

documentsRouter.post('/from-sale', documentHandler(async (req, res) => {
  const { document, created } = await createDocumentFromSale(req.auth!.tenantId, req.auth!.sub, req.body ?? {});
  res.status(created ? 201 : 200).json({ document, created });
}));

documentsRouter.post('/:id/convert', documentHandler(async (req, res) => {
  const document = await convertDocument(req.auth!.tenantId, req.auth!.sub, req.params.id, req.body ?? {});
  res.status(201).json({ document });
}));

documentsRouter.post('/:id/cancel', documentHandler(async (req, res) => {
  const document = await cancelDocument(req.auth!.tenantId, req.params.id, req.body ?? {});
  res.json({ document });
}));
