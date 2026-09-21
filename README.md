# POS Algérie — Plateforme SaaS Multi-Tenant White-Label

Logiciel de Point de Vente et de Gestion de Stock, en marque blanche, conçu pour le marché
algérien (bilingue FR/AR, DZD, TVA locale, mode hors-ligne robuste).

## Démarrage rapide (vérifié)

```bash
npm install                 # installe les 3 workspaces (api, web, desktop) + packages/shared

# Base de données — deux options :
npm run db:up                # option A : MongoDB via Docker (docker-compose.yml)
npm run dev:mongo             # option B : mongod en mémoire, aucun Docker/root requis (dev/démo uniquement)

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run seed                 # crée un tenant, une boutique, un admin, un caissier, 3 produits
npm run dev:api               # démarre l'API sur :4000
npm run dev:web               # démarre le front sur :3000 (autre terminal)
```

Le `seed` affiche le `tenantId` et le `storeId` à saisir sur l'écran de connexion caisse
(PIN caissier : `1234`). `npm run typecheck` valide les 3 workspaces sans erreur.

## Documentation

- [`docs/INSTALL.md`](docs/INSTALL.md) — installation sur une nouvelle machine, dev, build de
  l'app desktop (installateur Windows `.exe`).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture globale, stack, arborescence.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — modélisation MongoDB (Tenant, User, Product, Stock, Sale, Receipt, SyncQueue).
- [`docs/SYNC_STRATEGY.md`](docs/SYNC_STRATEGY.md) — stratégie offline-first et synchronisation Dexie ↔ MongoDB.

## Arborescence du monorepo

```
POS/
├── apps/
│   ├── web/                    # Next.js — UI caisse, back-office, PWA offline-first
│   │   ├── lib/
│   │   │   ├── db/offline-db.ts        # Schéma Dexie (IndexedDB)
│   │   │   ├── sync/sync-engine.ts     # Moteur de synchro offline ↔ online
│   │   │   └── print/                  # Génération ticket + rasterisation ESC/POS
│   │   ├── hooks/               # useOnlineStatus, useCreateSale
│   │   └── components/pos/      # SaleCheckout, OfflineBanner
│   ├── api/                    # Node.js (Express) — API REST + WebSocket + MongoDB
│   │   └── src/
│   │       ├── models/          # Schémas Mongoose (multi-tenant)
│   │       └── modules/sync/    # Endpoints push/pull de synchronisation
│   └── desktop/                 # Electron — shell natif, accès imprimante/scanner USB
├── packages/
│   └── shared/                  # Types TypeScript partagés web/api/desktop
└── docs/
```

## Stack

| Couche | Techno |
|---|---|
| Frontend caisse & back-office | Next.js (App Router) + Tailwind + Shadcn UI |
| Backend API | Node.js + Express + Mongoose + Socket.io |
| Base cloud | MongoDB Atlas (multi-tenant, isolation par `tenantId`) |
| Base locale (par poste de caisse) | Dexie.js (IndexedDB) |
| Application desktop | Electron (impression ESC/POS, douchette, tiroir-caisse) |

Ce dépôt contient le squelette architectural et des implémentations fonctionnelles des points
les plus sensibles (mode offline, synchronisation, impression thermique). Il est prévu comme
base à étendre, pas comme produit fini clé en main.
