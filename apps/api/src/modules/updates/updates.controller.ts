import { Router, Request, Response } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { asyncHandler } from '../../middleware/asyncHandler';

/**
 * Mises à jour du poste desktop (electron-updater, provider « generic »).
 *  - GET  /updates/latest.yml, /updates/<installeur>.exe, … : fichiers publiés, lus par le poste ;
 *  - PUT  /updates/files/:name : publication d'une version (en-tête x-admin-key = LICENSE_ADMIN_KEY),
 *    utilisée par `npm run publish:update --workspace @pos-dz/desktop`.
 * `UPDATES_DIR` doit pointer vers un volume persistant (disque Render) pour survivre aux redéploiements.
 */
export const updatesRouter = Router();

const dir = () => path.resolve(env.updatesDir);
// Nom de fichier plat uniquement : aucun séparateur de chemin, pas de « .. ».
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

function authorized(req: Request): boolean {
  const given = Buffer.from(String(req.headers['x-admin-key'] ?? ''));
  const expected = Buffer.from(env.licenseAdminKey ?? '');
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

updatesRouter.put('/files/:name', asyncHandler(async (req: Request, res: Response) => {
  if (!authorized(req)) return res.status(403).json({ error: 'Accès refusé.' });
  const name = req.params.name;
  if (!SAFE_NAME.test(name) || name.includes('..')) return res.status(400).json({ error: 'Nom de fichier invalide.' });
  fs.mkdirSync(dir(), { recursive: true });
  // Écriture vers un fichier temporaire puis renommage : un poste ne lit jamais un installeur à moitié reçu.
  const tmp = path.join(dir(), `.${name}.part`);
  await pipeline(req, fs.createWriteStream(tmp));
  fs.renameSync(tmp, path.join(dir(), name));
  res.status(201).json({ published: name });
}));

updatesRouter.use(
  express.static(dir(), {
    index: false,
    dotfiles: 'deny',
    // latest.yml décide s'il existe une mise à jour : jamais de cache, contrairement aux installeurs versionnés.
    setHeaders: (res, file) => {
      if (file.endsWith('.yml')) res.setHeader('Cache-Control', 'no-store');
    },
  }),
);
