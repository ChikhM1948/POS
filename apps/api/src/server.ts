import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { connectDB } from './db/connect';
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
import { updatesRouter } from './modules/updates/updates.controller';

async function main() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  // Limite par défaut d'Express (100kb) trop basse : les logos/photos produit envoyés en data URL
  // base64 (voir ProductForm, TenantSettingsForm) la dépassent facilement et provoquaient un 500
  // générique avant même d'atteindre la route.
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/auth', authRouter);
  app.use('/license', licenseRouter);
  app.use('/updates', updatesRouter);
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

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: env.corsOrigin } });

  io.on('connection', (socket) => {
    socket.on('join-tenant', (tenantId: string) => socket.join(`tenant:${tenantId}`));
  });

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] démarré sur http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] échec du démarrage:', err);
  process.exit(1);
});
