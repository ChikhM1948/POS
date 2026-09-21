# Stratégie de synchronisation Offline ⇄ Online

## Principe : write-local-first, sync-in-background

Chaque action métier (vente, mouvement de stock) s'écrit **d'abord et uniquement** dans Dexie
(IndexedDB), en local, quel que soit l'état du réseau. L'UI ne bloque jamais en attendant une
réponse serveur. Une entrée est ajoutée simultanément dans la table `syncQueue` locale (outbox).
Le moteur de synchro vide cette outbox dès que le réseau est disponible.

```
   UI (checkout)
        │  1. écrit Sale + StockMovements dans Dexie (transaction locale)
        ▼
   Dexie (IndexedDB)
        │  2. enqueue dans `syncQueue` (outbox)
        ▼
   SyncEngine (déclenché par: event 'online', interval 30s, retour app au premier plan)
        │  3. POST /sync/push  { operations: [...] }   ── idempotent (clientGeneratedId)
        ▼
   API Node.js
        │  4. upsert par clientGeneratedId (jamais de doublon si rejoué)
        ▼
   MongoDB Atlas
        │  5. réponse contient les IDs serveur confirmés
        ▼
   SyncEngine
        │  6. marque les entrées outbox comme `synced`, purge après confirmation
        ▼
   GET /sync/pull?since=lastSyncedAt   (catalogue produits, prix, stock global, autres caisses)
        │  7. applique les changements entrants dans Dexie
        ▼
   Dexie mis à jour → UI réactive (React Query / SWR invalidation)
```

## Idempotence : la clé de voûte

Chaque opération générée côté caisse porte un `clientGeneratedId` (UUID v4) créé **au moment de
la création locale**, pas au moment de l'envoi. Le serveur fait un `findOneAndUpdate` avec
`upsert: true` sur `{tenantId, clientGeneratedId}`. Conséquences :

- Un push réseau qui échoue à mi-chemin (coupure pendant l'upload) peut être **rejoué sans risque**
  — le serveur reconnaît l'opération déjà appliquée et répond simplement avec succès.
- Deux caisses ne génèrent jamais le même `clientGeneratedId` (UUID v4, collision négligeable).
- Il n'y a **aucune tentative de merge** sur les ventes : une vente est un fait immuable, elle
  n'est jamais modifiée après création (un retour crée une nouvelle `Sale` de type `refund`, liée
  par `refundOf`).

## Pourquoi il n'y a (presque) jamais de conflit à résoudre

La résolution de conflits classique (dernier écrivain gagne, merge 3-voies...) est évitée par
construction plutôt que gérée après coup :

- **Ventes** : append-only, jamais éditées → pas de conflit possible.
- **Stock** : ledger de mouvements (`StockMovement`), pas un compteur → les écritures concurrentes
  s'additionnent au lieu de s'écraser (voir [`DATA_MODEL.md`](./DATA_MODEL.md#stockmovement)).
- **Catalogue produit** (prix, description) : modifié uniquement depuis le back-office (toujours
  en ligne), jamais depuis une caisse hors-ligne → source de vérité unique, pas de concurrence.
  Le seul cas à surveiller : un produit modifié en ligne pendant qu'une caisse est hors-ligne avec
  un prix caché en mémoire — c'est acceptable en POS (le prix au moment de la vente est figé dans
  `Sale.lines[]` de toute façon) et rattrapé au prochain `pull`.

## Détection de l'état réseau

`navigator.onLine` n'est pas fiable à 100% (faux positifs sur portails captifs, Wi-Fi sans
Internet). Le moteur de synchro combine :

1. Les événements `online` / `offline` du navigateur (réactivité immédiate).
2. Un **health-check** léger (`GET /health`, timeout 3s) avant chaque tentative de push, pour
   confirmer que l'API est réellement joignable.
3. Un intervalle de repli (30s) pour retenter même si l'événement `online` n'a pas été capté par
   Electron.

## Ordre d'application au pull

Le `pull` applique les changements dans un ordre qui respecte les dépendances : `Tenant/branding`
→ `Product` → `StockBalance` (vue matérialisée en lecture seule) → autres. Les ventes des autres
caisses ne sont **pas** rejouées vers Dexie (chaque caisse n'a besoin que de son propre historique
local + de l'état consolidé du stock), ce qui garde la base locale légère.

## Voir le code

- Client : `apps/web/lib/db/offline-db.ts`, `apps/web/lib/sync/sync-engine.ts`
- Serveur : `apps/api/src/modules/sync/sync.controller.ts`, `sync.service.ts`
