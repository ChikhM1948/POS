import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { documentsRouter } from './modules/documents/documents.controller';
import { authRouter } from './modules/auth/auth.controller';
import { syncRouter } from './modules/sync/sync.controller';
import { productsRouter } from './modules/products/products.controller';
import { stockRouter } from './modules/stock/stock.controller';
import { storesRouter } from './modules/stores/stores.controller';
import { salesRouter } from './modules/sales/sales.controller';
import { reportsRouter } from './modules/reports/reports.controller';
import { usersRouter } from './modules/users/users.controller';
import { tenantRouter } from './modules/tenant/tenant.controller';
import { suppliersRouter } from './modules/suppliers/suppliers.controller';
import { customersRouter } from './modules/customers/customers.controller';
import { requireAuth, requireRole } from './middleware/auth';
import { requireLicense } from './middleware/license';
import { licenseRouter } from './modules/license/license.controller';
import { rateLimit } from './middleware/rateLimit';
import { updatesRouter } from './modules/updates/updates.controller';

/** Construit l'application Express (partagée entre le serveur Node classique et la fonction Vercel). */
export function createApp(opts: { updates: boolean } = { updates: true }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // derrière Vercel/Render : req.ip = vraie IP client (limiteurs de débit)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  });
  app.use(cors({ origin: env.corsOrigin }));
  // Limite par défaut d'Express (100kb) trop basse : les logos/photos produit envoyés en data URL
  // base64 (voir ProductForm, TenantSettingsForm) la dépassent facilement et provoquaient un 500
  // générique avant même d'atteindre la route.
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Anti brute-force : connexions (par IP + identifiant visé), PIN plus strict, et routes de licence publiques.
  const credKey = (req: express.Request) => String(req.body?.email ?? req.body?.storeId ?? '').toLowerCase().slice(0, 100);
  app.use('/auth/login-pin', rateLimit({ windowMs: 15 * 60_000, max: 10, key: credKey, message: 'Trop de tentatives de PIN. Réessayez dans 15 minutes.' }));
  app.use(['/auth/login', '/auth/login-cashier'], rateLimit({ windowMs: 15 * 60_000, max: 10, key: credKey, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }));
  app.use(['/auth/setup', '/auth/replicate-bootstrap'], rateLimit({ windowMs: 60 * 60_000, max: 20 }));
  app.use('/license', rateLimit({ windowMs: 15 * 60_000, max: 60 }));
  app.use('/updates/files', rateLimit({ windowMs: 15 * 60_000, max: 20 }));
  app.use('/auth', authRouter);
  app.use('/license', licenseRouter);
  // Sur Vercel, pas de disque persistant ni de corps > 4,5 Mo : les mises à jour desktop restent sur le serveur dédié.
  if (opts.updates) app.use('/updates', updatesRouter);
  // Tout ce qui suit exige une licence valide (essai 14 jours ou clé payante) : 402 LICENSE_EXPIRED sinon.
  app.use(['/sync', '/products', '/stock', '/stores', '/sales', '/documents', '/reports', '/users', '/tenant', '/suppliers', '/customers'], requireAuth, requireLicense);
  app.use('/sync', requireAuth, syncRouter);
  app.use('/products', requireAuth, productsRouter);
  app.use('/stock', requireAuth, stockRouter);
  app.use('/stores', requireAuth, storesRouter);
  // Données financières — réservées aux rôles admin, contrairement au catalogue et au stock
  // consultables par le caissier/stock_manager.
  app.use('/sales', requireAuth, requireRole('store_admin', 'super_admin'), salesRouter);
  app.use('/documents', requireAuth, requireRole('store_admin', 'super_admin'), documentsRouter);
  app.use('/reports', requireAuth, requireRole('store_admin', 'super_admin'), reportsRouter);
  // Provisionnement de l'équipe (cashier/stock_manager) et branding — restriction de rôle appliquée
  // dans chaque routeur (users: tout réservé aux admins ; tenant: lecture ouverte, écriture admin).
  app.use('/users', requireAuth, usersRouter);
  app.use('/tenant', requireAuth, tenantRouter);
  // Fournisseurs (dettes d'achat) et clients (dettes de vente / crédit "Karna") — restrictions de
  // rôle appliquées dans chaque routeur, voir suppliers.controller.ts / customers.controller.ts.
  app.use('/suppliers', requireAuth, suppliersRouter);
  app.use('/customers', requireAuth, customersRouter);

  // Filet de sécurité final : toute erreur relayée par asyncHandler (voir middleware/asyncHandler.ts)
  // atterrit ici en 500 au lieu de faire planter le process — DOIT rester le dernier middleware.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    // Erreurs métier volontaires (ex. licence : 403/404/409) : on renvoie leur message tel quel.
    if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('[api] erreur non gérée:', err);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  };
  app.use(errorHandler);

  return app;
}
