# Installation

## Prérequis

- **Node.js** (v20+ recommandé ; ce dépôt est développé avec v24) et npm.
- **Docker**, uniquement si vous utilisez MongoDB via `npm run db:up` (sinon `npm run dev:mongo`
  lance un MongoDB en mémoire, sans Docker ni droits root).
- **Imprimante USB ESC/POS** (optionnel), pour tester l'impression ticket et le tiroir-caisse
  depuis l'app desktop.
- Pour packager l'app desktop en installateur Windows (`.exe`) : voir
  [Build de l'app desktop](#build-de-lapp-desktop-installateur) ci-dessous.

## Récupérer le code sur une nouvelle machine

Ce dépôt n'a pas (encore) de remote git. Deux options :

**A. Copier le dossier directement** (réseau local, clé USB, etc.) :
```bash
tar --exclude=node_modules --exclude='*/node_modules' --exclude='.next' \
    --exclude='dist' --exclude='out' --exclude='release' \
    -czf pos-dz.tar.gz -C <dossier-parent> POS

# sur la machine cible :
tar -xzf pos-dz.tar.gz
```

**B. Initialiser git et pousser vers un remote**, puis `git clone` sur la machine cible.

## Installation automatisée sur Windows

Sur un poste Windows (serveur/back-office, pas un simple poste caisse qui ne fait tourner que
l'installateur `.exe` desktop), `scripts\install.bat` automatise toute la section suivante :
détection/installation de Node.js et de MongoDB (Docker ou MongoDB Community Server via
`winget`), `npm install`, génération de `apps/api/.env` et `apps/web/.env.local`, et `npm run seed`.

Double-cliquez sur `scripts\install.bat`, ou en ligne de commande :
```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows-install.ps1
```
Le script demande le mode de base de données à utiliser :
1. **Local uniquement** — MongoDB sur ce PC, rien dans le cloud.
2. **Atlas uniquement** — l'API se connecte directement à un cluster Atlas (voir
   [Déploiement production](#déploiement-production--desktop-connecté-à-une-api-en-ligne)).
3. **Local + synchro Atlas** — MongoDB local pour l'usage courant, avec une tâche planifiée
   Windows qui rejoue périodiquement `migrate-tenant-to-cloud.ts` (voir plus bas) pour tenir un
   cluster Atlas à jour en copie/backup/reporting. Synchro manuelle immédiate :
   `scripts\sync-now.bat`. Réglages (URI Atlas, ID tenant, intervalle) dans
   `scripts\sync-config.env`, généré par le script.

Pour tout le reste (lancer en dev, packager l'installateur `.exe`), suivez les sections
ci-dessous comme sur les autres OS.

## Installation et configuration

```bash
cd POS
npm install                                   # installe les 3 workspaces + packages/shared

npm run db:up          # MongoDB via Docker...
# ou
npm run dev:mongo      # ...ou MongoDB en mémoire (dev/démo uniquement)

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# éditez apps/api/.env si MongoDB n'est pas sur localhost, ou pour un JWT_SECRET réel

npm run seed            # crée tenant, boutique, admin, caissier, 3 produits
```

## Lancer en développement

```bash
npm run dev:api         # terminal 1 — API sur :4000
npm run dev:web         # terminal 2 — front Next.js sur :3000
npm run dev:desktop     # terminal 3 — shell Electron (optionnel)
```

`npm run dev:desktop` pointe par défaut sur `http://localhost:3000` (variable `NEXT_DEV_URL`) ;
surchargez-la si l'API/web tournent sur une autre machine :
```bash
NEXT_DEV_URL=http://192.168.1.50:3000 npm run dev:desktop
```

Connectez-vous avec le `tenantId`/`storeId` affichés par `npm run seed`, PIN caissier `1234`.

L'impression thermique et l'ouverture du tiroir-caisse ne fonctionnent qu'avec une imprimante
USB ESC/POS réellement branchée (`escpos-usb` détecte automatiquement la première trouvée) —
sans imprimante, ces actions échoueront simplement, c'est normal en dev.

## Build de l'app desktop (installateur `.exe`)

```bash
npm run build:desktop:win
```

Ceci enchaîne :
1. `next build` de `apps/web` en export statique (`BUILD_TARGET=desktop`, voir
   `apps/web/next.config.js`) ;
2. la copie de cet export dans `apps/desktop/renderer` (`apps/desktop/scripts/copy-renderer.js`) ;
3. `electron-builder --win`, qui produit `apps/desktop/release/POS Algerie Setup <version>.exe`.

**Important — construire l'installateur Windows depuis Linux/macOS nécessite Wine**
(`electron-builder` doit exécuter l'outillage NSIS, un binaire Windows). Sans Wine, la commande
s'arrête après avoir généré `apps/desktop/release/win-unpacked/POS Algerie.exe` — un exécutable
Windows portable et fonctionnel, mais sans installeur/désinstalleur ni entrée dans le menu
Démarrer (à copier tel quel sur la machine cible).

Pour obtenir l'installateur `.exe` complet, deux options :
- **Lancez `npm run build:desktop:win` directement sur une machine Windows** (aucune dépendance
  Wine dans ce cas, tout l'outillage NSIS est natif) ;
- **Ou installez Wine** sur la machine Linux/macOS de build (`sudo apt install wine` sur
  Debian/Ubuntu), puis relancez la commande.

D'autres cibles sont disponibles via electron-builder (`--mac`, `--linux`) en ajoutant les
sections correspondantes dans le champ `"build"` de `apps/desktop/package.json`.

## Déploiement production : desktop connecté à une API en ligne

Cible client : l'app desktop packagée (`.exe`) tourne sur les postes de caisse et parle à une API
hébergée en ligne (pas `localhost`) — MongoDB Atlas + `apps/api` déployé sur un serveur/VPS avec un
nom de domaine, HTTPS.

L'app desktop packagée ne lit jamais `NEXT_DEV_URL` (réservé au dev) : en production elle sert son
propre build statique via un serveur local à **port fixe**
(`http://127.0.0.1:47623`, voir `RENDERER_PORT` dans `apps/desktop/main.ts`) et appelle l'API à
l'URL figée dans le bundle au moment du build via `NEXT_PUBLIC_API_URL`.

**0. Créer le cluster MongoDB Atlas** sur [cloud.mongodb.com](https://cloud.mongodb.com) :
- Database Access → créer un utilisateur applicatif (distinct de votre login Atlas), mot de passe
  généré fort.
- Network Access → autoriser l'IP publique du serveur qui hébergera `apps/api` (éviter `0.0.0.0/0`
  au-delà de tests jetables).
- Connect → Drivers → copier l'URI `mongodb+srv://...`, en ajoutant le nom de la base avant les
  paramètres : `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pos-dz?retryWrites=true&w=majority`.

> **Si `mongodb+srv://` échoue avec `queryTxt ETIMEOUT`** : certains réseaux/sandbox bloquent
> spécifiquement les requêtes DNS `TXT` (utilisées par le format SRV pour les options de connexion)
> tout en laissant passer les `SRV`. Contournement : passer au format `mongodb://` classique avec
> les 3 hôtes du replica set en clair (visibles via `nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net`
> ou dans Atlas → Connect → "Standard connection string") :
> ```
> mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/pos-dz?ssl=true&authSource=admin&retryWrites=true&w=majority
> ```

**1. Déployer l'API** quelque part de joignable publiquement (VPS, PaaS...). Configurez son `.env` :
```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pos-dz?retryWrites=true&w=majority
JWT_SECRET=<secret fort, différent du défaut dev>
CORS_ORIGIN=http://127.0.0.1:47623
# + le domaine du front web si vous déployez aussi un accès navigateur, séparé par une virgule :
# CORS_ORIGIN=https://caisse.votredomaine.dz,http://127.0.0.1:47623
```

**2. Builder l'app desktop en pointant vers cette API** (au lieu de `localhost:4000`) :
```bash
NEXT_PUBLIC_API_URL=https://api.votredomaine.dz npm run build:desktop:win
```
`NEXT_PUBLIC_API_URL` est un env var Next.js "public" : il est figé dans le JS du build statique
au moment du `next build`, pas lu au runtime — d'où le préfixer explicitement sur cette commande
(l'`.env.local` par défaut ne sert que pour `npm run dev:web`).

**3. Distribuer l'installateur** (`apps/desktop/release/POS Algerie Setup <version>.exe`) aux
postes de caisse. Chaque poste garde son fonctionnement offline-first habituel (voir
[`SYNC_STRATEGY.md`](SYNC_STRATEGY.md)) : les ventes s'écrivent toujours en local d'abord et se
synchronisent dès que l'API en ligne est joignable — utile en cas de coupure réseau ponctuelle,
même si l'usage nominal reste connecté.

**Si vous changez `RENDERER_PORT`** dans `apps/desktop/main.ts` (ex. conflit avec un autre
logiciel sur les postes de caisse), mettez à jour `CORS_ORIGIN` côté API en conséquence — sinon
l'app desktop packagée se retrouve bloquée par CORS sur chaque appel API.

## Mode Local vs Synchronisé — et migration d'un commerce local vers le cloud

Chaque commerce (Tenant) a un indicateur `syncEnabled`, choisi à la création (écran de premier
lancement) et modifiable ensuite dans le back-office (`/admin/settings`) :
- **Synchronisé** : la caisse pousse/tire ses données (`SyncEngine`) vers l'API configurée.
- **Local** : le `SyncEngine` de la caisse ne tourne jamais — aucune donnée ne quitte le poste
  tant que ce commerce reste sur ce mode.

Ce commutateur ne change **pas** à quelle base de données `apps/api` est connecté — ça reste une
seule connexion MongoDB pour tout le déploiement (`MONGODB_URI`), partagée par tous les tenants.
Un commerce vraiment "local" (déploiement complet avec MongoDB local/LAN, pas Atlas — voir
[Déploiement production](#déploiement-production--desktop-connecté-à-une-api-en-ligne) ci-dessus)
qui veut ensuite devenir accessible depuis le web doit donc être **migré** vers Atlas, pas juste
re-basculé côté UI :

```bash
cd apps/api
npx tsx src/scripts/migrate-tenant-to-cloud.ts \
  --tenant-id=<id du tenant à migrer> \
  --source="mongodb://localhost:27017/pos-dz" \
  --target="mongodb+srv://user:pass@cluster.mongodb.net/pos-dz?retryWrites=true&w=majority"
```

Copie (upsert par `_id`, donc rejouable sans risque si interrompu) toutes les données de ce tenant
— boutique, utilisateurs, catalogue, clients, fournisseurs, ventes, mouvements de stock — de la
source vers la cible, et force `syncEnabled: true` sur le tenant migré. **Étapes suivantes,
manuelles** : reconfigurer `MONGODB_URI` de ce déploiement `apps/api` vers la cible, puis
redémarrer — les caisses déjà configurées se resynchronisent automatiquement à leur prochaine
connexion (idempotent : les ventes déjà migrées ne sont jamais dupliquées, voir
[`SYNC_STRATEGY.md`](SYNC_STRATEGY.md#idempotence--la-clé-de-voûte)).
