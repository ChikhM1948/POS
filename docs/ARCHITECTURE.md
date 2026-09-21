# Architecture globale

## 1. Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────┐
│                         POSTE DE CAISSE (magasin)                    │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  Electron Shell                                             │      │
│  │  ┌──────────────────────────────┐   ┌─────────────────────┐│      │
│  │  │  Next.js app (renderer)       │   │ Main process         ││      │
│  │  │  - UI caisse React            │◄──┤ - Accès USB scanner  ││      │
│  │  │  - Dexie.js (IndexedDB)       │   │ - Impression ESC/POS ││      │
│  │  │  - Sync engine                │   │ - Tiroir-caisse       ││      │
│  │  └──────────────────────────────┘   └─────────────────────┘│      │
│  └────────────────────────────────────────────────────────────┘      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  HTTPS / WebSocket (quand disponible)
                                 ▼
                    ┌────────────────────────────┐
                    │   API Node.js (Express)     │
                    │  - Auth (JWT) + rôles        │
                    │  - Endpoints /sync/push,pull │
                    │  - Socket.io (push temps réel)│
                    └───────────────┬──────────────┘
                                    ▼
                    ┌────────────────────────────┐
                    │   MongoDB Atlas              │
                    │  - Isolation par tenantId     │
                    │  - Index composés (tenant+…)  │
                    └────────────────────────────┘
```

Chaque poste de caisse est **autonome** : il encaisse, imprime et gère le stock localement via
Dexie même en coupure réseau prolongée. La synchronisation est un processus d'arrière-plan, pas
une dépendance bloquante du flux de vente.

## 2. Multi-tenant & White-Label

- **Isolation logique par `tenantId`** sur chaque document MongoDB (pas de DB séparée par client —
  plus simple à opérer à l'échelle, avec index composés `{tenantId: 1, ...}` partout et un plugin
  Mongoose qui refuse toute requête sans `tenantId` explicite).
- Le `tenantId` est résolu à l'authentification (JWT contient `tenantId`, `storeId`, `role`) et
  injecté automatiquement dans le contexte de chaque requête côté API.
- Le **branding** (logo, couleurs, en-tête/pied de ticket, langue par défaut) est stocké sur le
  document `Tenant` et chargé côté client au démarrage ; il est aussi mis en cache localement
  (Dexie) pour fonctionner hors-ligne, y compris pour l'impression des tickets.
- Rôles : `super_admin` (plateforme, gère les tenants), `store_admin`, `cashier`, `stock_manager`.
  Les permissions fines sont dérivées du rôle + d'une liste `permissions[]` optionnelle par user
  pour les cas particuliers.

## 3. Pourquoi ce choix d'architecture offline-first

Le point critique du marché algérien est la **connectivité intermittente**. Deux décisions
structurantes en découlent :

1. **Le stock n'est jamais un compteur muet, c'est un registre de mouvements** (`StockMovement`,
   append-only). Si deux caisses vendent le même produit hors-ligne puis se synchronisent, on ne
   peut pas avoir de conflit d'écriture sur un même champ `quantity` — chaque mouvement est un
   nouveau document horodaté, et le stock courant est la somme des mouvements. Voir
   [`DATA_MODEL.md`](./DATA_MODEL.md#stockmovement).
2. **Toute écriture métier (vente, mouvement de stock) est générée avec un `clientGeneratedId`
   (UUID v4) côté poste de caisse**, avant même de savoir si le réseau est disponible. Cet ID sert
   de clé d'idempotence côté serveur : rejouer la synchronisation ne crée jamais de doublon. Voir
   [`SYNC_STRATEGY.md`](./SYNC_STRATEGY.md).

## 4. Numérotation des tickets hors-ligne

Un numéro de vente séquentiel global (ex. `000123`) est impossible à garantir sans serveur central
disponible. On utilise donc un numéro **composite** attribué localement :
`{storeCode}-{registerId}-{compteurLocal}` (ex. `ALG01-R2-00456`), garanti unique sans
coordination réseau, lisible sur le ticket, et non réutilisé même après réinstallation (le
compteur local persiste dans Dexie et n'est jamais remis à zéro automatiquement).

## 5. Spécificités marché algérien — où elles vivent dans le code

| Exigence | Implémentation |
|---|---|
| Bilingue FR/AR, RTL/LTR | `Product.name.{fr,ar}`, rendu ticket par canvas (supporte RTL nativement) plutôt que texte ESC/POS brut — voir `lib/print/` |
| DZD, formatage monétaire | `Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' })` côté UI ; montants stockés en **centimes entiers** (integer) pour éviter les erreurs d'arrondi flottant |
| TVA 19% / 9% / exonéré | `Product.taxRate` (enum), calculé ligne par ligne dans `Sale.lines[].taxRate`, jamais recalculé a posteriori |
| Timbre fiscal (paiement espèces) | `Sale.totals.stampDuty`, calculé côté caisse selon barème, appliqué uniquement si `payments` inclut `cash` |
| RC / NIF / NIS / AI | `Tenant.legal.{rc, nif, nis, ai}`, imprimés en pied de ticket et sur facture |
| Crédit client ("Karna") | `Sale.payments[]` accepte `type: 'credit'` avec `customerId` obligatoire ; suivi de solde dans une collection `CustomerAccount` (non détaillée ici, même pattern que `StockMovement` — ledger de transactions, pas de solde mutable) |

## 6. Ce qui est fourni dans ce dépôt vs. à construire

**Fourni (fonctionnel, à adapter)** : schémas Mongoose complets, schéma Dexie, moteur de sync
push/pull avec idempotence, hooks React offline-first, rendu de ticket + rasterisation ESC/POS.

**À construire** : authentification complète (JWT + refresh), UI back-office, gestion des
variantes/transferts inter-magasins en détail, intégration paiement CIB/Edahabia (passerelle
bancaire), génération PDF facture, tests automatisés, CI/CD.
