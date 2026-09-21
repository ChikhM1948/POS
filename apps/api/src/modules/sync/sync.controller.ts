import { Router, Response } from 'express';
import { applyOperation, pullChangesSince } from './sync.service';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import type { SyncPushRequest, SyncPushResponse } from '@pos-dz/shared';

export const syncRouter = Router();

/**
 * POST /sync/push — traite un lot d'opérations en attente depuis l'outbox du poste de caisse.
 * Chaque opération est appliquée indépendamment et de façon idempotente : un échec partiel
 * (ex. une opération rejetée pour stock négatif) ne bloque pas les autres.
 *
 * Le tenantId du body doit correspondre à celui du JWT — sinon un poste de caisse authentifié
 * pour un tenant pourrait pousser des données au nom d'un autre tenant (fuite inter-commerces).
 */
syncRouter.post('/push', asyncHandler(async (req: AuthenticatedRequest & { body: SyncPushRequest }, res: Response) => {
  const { tenantId, deviceId, operations } = req.body;

  if (!tenantId || !deviceId || !Array.isArray(operations)) {
    return res.status(400).json({ error: 'tenantId, deviceId et operations[] sont requis.' });
  }
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ error: 'tenantId ne correspond pas au token authentifié.' });
  }

  const results = [];
  for (const op of operations) {
    results.push(await applyOperation(tenantId, deviceId, op));
  }

  const response: SyncPushResponse = { results, serverTime: new Date().toISOString() };
  res.json(response);
}));

/**
 * GET /sync/pull?since=ISO8601 — renvoie le référentiel consolidé (catalogue, stock)
 * modifié depuis le dernier horodatage de synchro connu du client.
 */
syncRouter.get('/pull', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, since } = req.query as { tenantId?: string; since?: string };

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId est requis.' });
  }
  if (tenantId !== req.auth?.tenantId) {
    return res.status(403).json({ error: 'tenantId ne correspond pas au token authentifié.' });
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  const changes = await pullChangesSince(tenantId, sinceDate);
  res.json(changes);
}));
