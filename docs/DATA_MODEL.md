# Modélisation MongoDB

Toutes les collections métier portent un champ `tenantId` indexé et sont interrogées via un
plugin Mongoose (`tenantScopePlugin`, voir `apps/api/src/models/plugins/tenantScope.ts` —
à créer en s'inspirant des schémas ci-dessous) qui force la présence de `tenantId` dans chaque
requête. Les montants monétaires sont stockés en **centimes entiers** (`Number`, integer) — jamais
en `Float` — pour éviter la dérive d'arrondi sur des milliers de transactions.

Schémas complets : voir `apps/api/src/models/*.ts`. Résumé des décisions de modélisation :

## Tenant
Un commerce/enseigne. Porte le branding (logo, couleurs, en-tête/pied de ticket), les mentions
légales algériennes (RC/NIF/NIS/AI), la devise et la langue par défaut, le plan d'abonnement.

## User
Rattaché à un `tenantId` (+ éventuellement un `storeId` si multi-boutique). `role` détermine les
permissions par défaut ; `pinCode` (haché) permet une connexion rapide au poste de caisse sans
retaper un mot de passe long à chaque changement de caissier.

## Product
Fiche produit avec `name.fr` / `name.ar`, `taxRate`, et un tableau `variants[]` (taille, couleur,
code-barres propre, prix optionnel). Le **prix d'achat moyen pondéré (PUMP)** n'est pas stocké
comme un champ mutable sur `Product` : il est **recalculé** à partir du ledger `StockMovement`
(moyenne pondérée des mouvements `type: 'purchase'`), pour rester cohérent même si des achats sont
saisis hors-ligne dans le désordre.

## StockMovement (le cœur du modèle offline-safe)
**Append-only.** Chaque entrée/sortie de stock (vente, achat, retour, transfert, correction
d'inventaire, péremption) crée un nouveau document avec un `quantityDelta` signé — jamais de
`UPDATE` sur une quantité existante. Le stock courant d'un produit dans un magasin est calculé
(ou matérialisé en cache dans `StockBalance`, recalculable à tout moment) comme la somme des
`quantityDelta`. C'est ce choix qui rend la synchronisation multi-caisses **sans conflit** :
deux caisses qui vendent le même article hors-ligne produisent deux mouvements distincts qui
s'additionnent proprement à la sync, au lieu de s'écraser l'une l'autre.

Champs clés : `productId`, `variantSku`, `storeId`, `type`, `quantityDelta`, `unitCost` (pour le
PUMP), `lotNumber` / `expiryDate` (périssables), `sourceDocument` (référence la vente ou le
transfert d'origine), `clientGeneratedId` (idempotence sync).

## Sale
Une vente = un ticket. `clientGeneratedId` (UUID généré côté caisse, avant même la tentative de
sync) est la clé d'idempotence — index unique `{tenantId, clientGeneratedId}`. `lines[]` fige le
prix, la TVA et la remise **au moment de la vente** (jamais de référence live à `Product`, pour
que l'historique reste exact même si le produit change de prix ensuite). `payments[]` supporte
plusieurs moyens de paiement sur une même vente (ex. espèces + crédit partiel).

## Receipt
Représentation imprimable d'une `Sale` (peut être réimprimée). Conserve le contenu rendu
(`rawContent`, buffer ESC/POS ou image) tel qu'imprimé la première fois, pour qu'une réimpression
soit identique même si le branding du tenant a changé depuis.

## SyncQueue (côté serveur)
Journal d'audit de toutes les opérations reçues des postes de caisse : `deviceId`, `entityType`,
`clientGeneratedId`, `status` (`pending`/`applied`/`rejected`), `error`. Sert au diagnostic
("pourquoi cette vente n'est pas remontée ?") et à la détection d'anomalies (un device qui rejoue
sans cesse la même opération rejetée, par exemple).

## Index composés essentiels

```
Tenant:         { slug: 1 } unique
User:           { tenantId: 1, email: 1 } unique
Product:        { tenantId: 1, storeId: 1, barcode: 1 }
                { tenantId: 1, sku: 1 } unique
StockMovement:  { tenantId: 1, storeId: 1, productId: 1, createdAt: -1 }
                { tenantId: 1, clientGeneratedId: 1 } unique
Sale:           { tenantId: 1, clientGeneratedId: 1 } unique
                { tenantId: 1, storeId: 1, createdAtLocal: -1 }
```
