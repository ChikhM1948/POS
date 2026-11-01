import { Router } from 'express';
import { Ctx, handler, HttpError } from '../util';

/** Sauvegarde / restauration de la base locale — réservé aux administrateurs. */
export function backupRouter({ backup }: Ctx) {
  const router = Router();
  router.get('/', handler((_req, res) => res.json(backup.status())));
  router.put('/config', handler((req, res) => {
    backup.setConfig(req.body ?? {});
    res.json(backup.status());
  }));
  router.post('/run', handler(async (_req, res) => {
    await backup.runBackup();
    res.json(backup.status());
  }));
  router.post('/restore', handler(async (req, res) => {
    const file = req.body?.file;
    if (typeof file !== 'string' || !file) throw new HttpError(400, 'Fichier de sauvegarde requis.');
    await backup.restore(file);
    res.json({ restarting: true });
  }));
  return router;
}
