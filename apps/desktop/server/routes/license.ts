import { Router } from 'express';
import { Ctx, handler } from '../util';

/** Public : doit rester joignable licence expirée pour pouvoir saisir une nouvelle clé. */
export function licenseRouter({ license }: Ctx) {
  const router = Router();
  router.get('/status', handler((_req, res) => res.json({ license: license.status() })));
  router.get('/device', handler((_req, res) => res.json({ deviceId: license.deviceId() })));
  router.post('/activate', handler(async (req, res) => res.json({ license: await license.activate(req.body?.key) })));
  router.post('/renew', handler(async (_req, res) => res.json({ license: await license.renew(true) })));
  return router;
}
