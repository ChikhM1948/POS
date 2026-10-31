import { Router } from 'express';
import { Ctx, handler } from '../util';

/** Synchronisation avec la base en ligne — réservé aux administrateurs (monté derrière `admins`). */
export function cloudRouter({ cloud }: Ctx) {
  const router = Router();
  router.get('/status', handler((_req, res) => res.json(cloud.status())));
  router.post('/connect', handler(async (req, res) => res.json(await cloud.connect(req.body ?? {}))));
  router.post('/sync', handler(async (_req, res) => res.json(await cloud.syncNow())));
  router.delete('/', handler((_req, res) => { cloud.disconnect(); res.json(cloud.status()); }));
  return router;
}
