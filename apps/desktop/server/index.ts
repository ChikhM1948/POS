import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase, type Db } from './db';
import { Ctx, requireAuth, requireLicense, requireRole } from './util';
import { LicenseManager } from './license';
import { licenseRouter } from './routes/license';
import { CloudSync } from './cloud';
import { applyPendingRestore, BackupManager } from './backup';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { stockRouter } from './routes/stock';
import { storesRouter, tenantRouter, usersRouter } from './routes/misc';
import { customersRouter, suppliersRouter } from './routes/parties';
import { syncRouter } from './routes/sync';
import { salesRouter } from './routes/sales';
import { documentsRouter } from './routes/documents';
import { reportsRouter } from './routes/reports';
import { cloudRouter } from './routes/cloud';
import { backupRouter } from './routes/backup';

export interface LocalServerOptions {
  /** Dossier des données (base SQLite). */
  dataDir: string;
  /** Export statique Next.js à servir (omis en test). */
  rendererDir?: string;
  port: number;
  /** Chemin explicite du binaire natif better-sqlite3 (hors asar en production). */
  nativeBinding?: string;
  /** Origine supplémentaire autorisée (serveur `next dev`). */
  devOrigin?: string;
  /** Demande à l'application de se relancer (appelé après la préparation d'une restauration). */
  onRestartRequired?: () => void;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Clé de signature des sessions : générée une fois par installation, stockée dans la base. */
function loadJwtSecret(db: Db): string {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'jwt_secret'").get() as { value: string } | undefined;
  if (row) return row.value;
  const secret = randomBytes(48).toString('hex');
  db.prepare("INSERT INTO app_meta (key, value) VALUES ('jwt_secret', ?)").run(secret);
  return secret;
}

export function createApi(ctx: Ctx) {
  const auth = requireAuth(ctx.jwtSecret, ctx.db);
  const admins = requireRole('store_admin', 'super_admin');
  const licensed = requireLicense(ctx.license);
  const api = express.Router();
  api.use(express.json({ limit: '10mb' })); // logos / photos produit en data URL base64
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  api.use('/auth', authRouter(ctx));
  api.use('/license', licenseRouter(ctx));
  // Licence expirée => 402 sur toute l'activité métier. /backup reste ouvert : les données du commerçant
  // ne doivent jamais être prises en otage ; /cloud aussi (la réplication n'est pas une fonctionnalité de caisse).
  api.use('/sync', auth, licensed, syncRouter(ctx));
  api.use('/products', auth, licensed, productsRouter(ctx));
  api.use('/stock', auth, licensed, stockRouter(ctx));
  api.use('/stores', auth, licensed, storesRouter(ctx));
  api.use('/sales', auth, licensed, admins, salesRouter(ctx));
  api.use('/documents', auth, licensed, admins, documentsRouter(ctx));
  api.use('/reports', auth, licensed, admins, reportsRouter(ctx));
  api.use('/users', auth, licensed, usersRouter(ctx));
  api.use('/tenant', auth, licensed, tenantRouter(ctx));
  api.use('/suppliers', auth, licensed, suppliersRouter(ctx));
  api.use('/customers', auth, licensed, customersRouter(ctx));
  api.use('/cloud', auth, admins, cloudRouter(ctx));
  api.use('/backup', auth, admins, backupRouter(ctx));
  api.use(((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('[local-api] erreur non gérée:', err);
    res.status(500).json({ error: 'Erreur interne.' });
  }) as express.ErrorRequestHandler);
  return api;
}

export async function startLocalServer(opts: LocalServerOptions): Promise<{ close: () => Promise<void>; db: Db; port: number }> {
  fs.mkdirSync(opts.dataDir, { recursive: true });
  const dbFile = path.join(opts.dataDir, 'pos-data.sqlite');
  applyPendingRestore(dbFile); // restauration préparée à la session précédente, avant d'ouvrir la base
  const db = openDatabase(dbFile, opts.nativeBinding);
  const backup = new BackupManager(db, dbFile, opts.nativeBinding, opts.onRestartRequired ?? (() => undefined));
  const cloud = new CloudSync(db);
  const ctx: Ctx = { db, jwtSecret: loadJwtSecret(db), cloud, backup, license: new LicenseManager(db, () => cloud.status().url) };
  ctx.cloud.start();
  backup.start();

  const app = express();
  app.disable('x-powered-by');

  // Le serveur n'écoute que sur 127.0.0.1, mais une page web quelconque ouverte sur la machine
  // pourrait quand même l'appeler : on refuse toute requête dont l'Origin n'est pas la nôtre.
  const allowed = [`http://127.0.0.1:${opts.port}`, `http://localhost:${opts.port}`, opts.devOrigin].filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowed.includes(origin)) return res.status(403).json({ error: 'Origine non autorisée.' });
    next();
  });

  app.use('/api', createApi(ctx));

  if (opts.rendererDir) {
    const root = opts.rendererDir;
    // L'export statique Next émet des routes sans extension (`/admin` -> `admin.html`) et des
    // assets absolus (`/_next/...`) : d'où ce petit serveur plutôt qu'un chargement file://.
    app.use((req, res) => {
      const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      let filePath = path.join(root, requestPath);
      if (filePath !== root && !filePath.startsWith(root + path.sep)) return res.status(403).end();
      if (filePath.endsWith(path.sep)) filePath = path.join(filePath, 'index.html');
      const tryRead = (candidates: string[]) => {
        const next = candidates.shift();
        if (!next) return res.status(404).send('Not found');
        fs.readFile(next, (err, data) => {
          if (err) return tryRead(candidates);
          res.type(MIME_TYPES[path.extname(next)] ?? 'application/octet-stream').send(data);
        });
      };
      tryRead([filePath, `${filePath}.html`]);
    });
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : opts.port;

  return {
    db,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        ctx.cloud.stop();
        backup.stop();
        server.close(() => {
          db.close();
          resolve();
        });
      }),
  };
}
