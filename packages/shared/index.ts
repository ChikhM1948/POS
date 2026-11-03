// Types partagés entre apps/api, apps/web et apps/desktop.
// Les montants monétaires sont TOUJOURS en centimes entiers (integer), jamais en float.

export type UserRole = 'super_admin' | 'store_admin' | 'cashier' | 'stock_manager';

export type TaxRate = 19 | 9 | 0;

export type PaymentMethod = 'cash' | 'cib' | 'edahabia' | 'cheque' | 'credit' | 'voucher';

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'refund'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'inventory_count'
  | 'spoilage';

export interface LocalizedText {
  fr: string;
  ar?: string;
}

export interface ProductVariant {
  sku: string;
  barcode?: string;
  attributes?: Record<string, string>; // e.g. { size: 'M', color: 'Rouge' }
  priceOverrideCents?: number;
}

export interface SaleLine {
  productId: string;
  variantSku?: string;
  name: LocalizedText;
  quantity: number;
  unitPriceCents: number;
  /** Coût d'achat unitaire figé au moment de la vente — sert au calcul du bénéfice a posteriori. */
  costPriceCents: number;
  taxRate: TaxRate;
  discountCents: number;
  lineTotalCents: number;
}

export interface SalePayment {
  method: PaymentMethod;
  amountCents: number;
  customerId?: string; // requis si method === 'credit'
  reference?: string; // ex. numéro de chèque, référence CIB
  tenderedCents?: number; // espèces reçues du client (method === 'cash')
  changeCents?: number; // monnaie rendue (method === 'cash')
}

export interface SaleTotals {
  subtotalCents: number;
  taxTotalCents: number;
  stampDutyCents: number;
  discountTotalCents: number;
  grandTotalCents: number;
}

/** Enveloppe générique d'une opération en attente de synchronisation (outbox client). */
export interface SyncOperation<TPayload = unknown> {
  clientGeneratedId: string;
  entityType: 'sale' | 'stockMovement';
  operation: 'create';
  payload: TPayload;
  createdAtLocal: string; // ISO 8601
  deviceId: string;
}

export interface SyncPushRequest {
  tenantId: string;
  deviceId: string;
  operations: SyncOperation[];
}

export interface SyncPushResult {
  clientGeneratedId: string;
  status: 'applied' | 'already_applied' | 'rejected';
  serverId?: string;
  error?: string;
}

export interface SyncPushResponse {
  results: SyncPushResult[];
  serverTime: string; // ISO 8601, à utiliser comme prochain `since`
}

export interface JwtClaims {
  sub: string; // userId
  tenantId: string;
  storeId?: string;
  role: UserRole;
  /** Uniquement pertinent pour role === 'cashier' — voir PERMISSION_VIEW_PURCHASE_PRICE. */
  canViewPurchasePrice?: boolean;
}

/** Dérogation fine accordée à un caissier au-delà de son rôle : le droit de voir le prix d'achat des produits. */
export const PERMISSION_VIEW_PURCHASE_PRICE = 'view_purchase_price';

// --- Back-office produits / stock ---

export interface ProductDTO {
  id: string;
  sku: string;
  barcode?: string;
  name: LocalizedText;
  category?: string;
  imageUrl?: string;
  unit: string;
  variants: ProductVariant[];
  sellingPriceCents: number;
  /** Coût d'achat — saisi librement par produit, ou recalculé en moyenne pondérée lors d'une réception fournisseur. */
  costPriceCents: number;
  /** Prix de vente minimum (DZD) sous lequel une remise caisse déclenche un avertissement — optionnel. */
  minSellingPriceCents?: number;
  /** Prix promotionnel — appliqué automatiquement à la caisse tant que la fenêtre [promoStart, promoEnd] est ouverte. null = pas de promo. */
  promoPriceCents?: number | null;
  promoStart?: string | null; // ISO 8601 ; absent = actif dès maintenant
  promoEnd?: string | null; // ISO 8601 ; absent = sans fin
  /** Vendu au poids : la caisse demande la pesée (kg) ou lit le code-barres balance. sellingPriceCents = prix au kg. */
  soldByWeight?: boolean;
  taxRate: TaxRate;
  isPerishable: boolean;
  lowStockThreshold?: number;
  active: boolean;
}

export type ProductInput = Omit<ProductDTO, 'id'>;

export interface StoreDTO {
  id: string;
  name: string;
  code: string;
  address?: string;
  isMainStore: boolean;
  active: boolean;
}

export interface StockBalanceDTO {
  productId: string;
  sku: string;
  name: LocalizedText;
  unit: string;
  isPerishable: boolean;
  lowStockThreshold?: number;
  quantity: number;
}

export interface StockMovementDTO {
  id: string;
  productId: string;
  variantSku?: string;
  storeId: string;
  type: StockMovementType;
  quantityDelta: number;
  unitCostCents?: number;
  lotNumber?: string;
  expiryDate?: string;
  note?: string;
  createdAtLocal: string;
}

export interface CreateStockMovementInput {
  productId: string;
  variantSku?: string;
  storeId: string;
  type: Extract<StockMovementType, 'adjustment' | 'inventory_count' | 'spoilage'>;
  quantityDelta: number;
  lotNumber?: string;
  expiryDate?: string;
  note?: string;
}

/** Lot d'un produit (regroupement des mouvements par numéro de lot + date de péremption). */
export interface StockBatchDTO {
  productId: string;
  sku: string;
  name: LocalizedText;
  unit: string;
  lotNumber?: string;
  expiryDate?: string; // ISO 8601
  quantity: number; // > 0 uniquement
  /** Jours restants avant péremption (négatif = périmé). Absent si le lot n'a pas de date. */
  daysLeft?: number;
}

export interface StockAlertsDTO {
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  expiryWarningDays: number;
}

export interface ReorderItemDTO {
  productId: string;
  sku: string;
  name: LocalizedText;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  suggestedQuantity: number;
  lastUnitCostCents: number;
}

export interface ReorderGroupDTO {
  supplierId: string | null; // null = aucun fournisseur connu pour ces produits
  supplierName: string | null;
  supplierPhone?: string;
  items: ReorderItemDTO[];
}

/** Réception fournisseur — flux dédié (voir POST /stock/purchases) car il met à jour le coût
 * moyen pondéré du produit et peut générer une dette fournisseur pour la part non payée. */
export interface CreatePurchaseInput {
  productId: string;
  variantSku?: string;
  storeId: string;
  quantity: number; // toujours positif
  unitCostCents: number;
  supplierId?: string;
  paidCents: number; // 0 <= paidCents <= quantity * unitCostCents
  lotNumber?: string;
  expiryDate?: string;
  note?: string;
}

// --- Back-office fournisseurs / clients & dettes (ledgers append-only) ---

export type LedgerEntryType = 'purchase_on_credit' | 'sale_credit' | 'payment' | 'adjustment';

export interface LedgerEntryDTO {
  id: string;
  type: LedgerEntryType;
  amountCents: number; // signé : positif = augmente la dette, négatif = la réduit
  note?: string;
  reference?: { type: 'sale' | 'purchase' | 'manual'; id: string };
  createdAtLocal: string;
}

export interface CreateLedgerPaymentInput {
  amountCents: number; // toujours positif, réduit la dette
  note?: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  active: boolean;
  balanceCents: number; // > 0 = on doit de l'argent à ce fournisseur
}

export interface SupplierInput {
  name: string;
  phone?: string;
  address?: string;
  active?: boolean;
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  balanceCents: number; // > 0 = ce client nous doit de l'argent ("Karna")
  creditLimitCents?: number; // plafond de crédit autorisé ; absent = illimité
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  creditLimitCents?: number;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  active?: boolean;
  creditLimitCents?: number | null; // null = retirer le plafond
}

// --- Back-office ventes / rapports ---

export interface SaleListItemDTO {
  id: string;
  number: string;
  type: 'sale' | 'refund';
  storeId: string;
  cashierName: string;
  createdAtLocal: string;
  grandTotalCents: number;
  paymentMethods: PaymentMethod[];
  status: 'completed' | 'voided';
}

export interface SaleDetailDTO extends SaleListItemDTO {
  lines: SaleLine[];
  payments: SalePayment[];
  totals: SaleTotals;
  refundOf?: string; // présent uniquement si type === 'refund'
  /** Aligné avec `lines[]` — présent uniquement si type === 'sale' : quantité déjà retournée par ligne. */
  refundedQuantities?: number[];
  /** Retours déjà effectués sur cette vente — présent uniquement si type === 'sale'. */
  refunds?: SaleListItemDTO[];
}

export interface SalesListResponse {
  sales: SaleListItemDTO[];
  total: number;
}

export interface RefundLineInput {
  productId: string;
  variantSku?: string;
  quantity: number;
}

export interface CreateRefundInput {
  lines: RefundLineInput[];
  paymentMethod: PaymentMethod;
  restock: boolean;
  note?: string;
}

export interface RevenueByDayPoint {
  date: string; // YYYY-MM-DD (fuseau Africa/Algiers)
  revenueCents: number;
  salesCount: number;
}

export interface RevenueByPaymentMethodPoint {
  method: PaymentMethod;
  amountCents: number;
}

export interface SalesSummaryDTO {
  salesCount: number;
  grossRevenueCents: number;
  refundsCents: number;
  refundsCount: number;
  netRevenueCents: number;
  taxCollectedCents: number;
  stampDutyCents: number;
  averageBasketCents: number;
  revenueByDay: RevenueByDayPoint[];
  revenueByPaymentMethod: RevenueByPaymentMethodPoint[];
}

export interface TopProductDTO {
  productId: string;
  name: LocalizedText;
  quantity: number;
  revenueCents: number;
}

export interface ProfitSummaryDTO {
  revenueCents: number; // net de TVA, ventes moins retours
  costCents: number;
  grossProfitCents: number;
  marginPercent: number; // grossProfit / revenue * 100, 0 si revenue = 0
}

export interface DebtorDTO {
  id: string;
  name: string;
  balanceCents: number;
}

export interface DebtsSummaryDTO {
  totalSupplierDebtCents: number;
  totalCustomerDebtCents: number;
  topSuppliers: DebtorDTO[];
  topCustomers: DebtorDTO[];
}

// --- Auth : création du commerce (premier lancement) & connexion ---

/**
 * Identifiant de connexion : email OU numéro de téléphone. Il est stocké dans le champ `email`
 * des comptes (clé unique de login), sous forme normalisée.
 */
export type IdentifierKind = 'email' | 'phone';

/** Normalise un numéro : retire espaces/points/tirets/parenthèses, convertit un préfixe `00` en `+`. */
export function normalizePhone(raw: string): string {
  const compact = String(raw ?? '').trim().replace(/[\s.\-()]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
}

export function isValidPhone(raw: string): boolean {
  return /^\+?\d{8,15}$/.test(normalizePhone(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw ?? '').trim());
}

/**
 * Détecte et normalise un identifiant (email en minuscules, ou téléphone nettoyé).
 * Retourne `null` si ce n'est ni un email ni un téléphone valide.
 */
export function parseIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.includes('@')) {
    return isValidEmail(trimmed) ? { kind: 'email', value: trimmed.toLowerCase() } : null;
  }
  return isValidPhone(trimmed) ? { kind: 'phone', value: normalizePhone(trimmed) } : null;
}

/** Normalisation tolérante pour le login : un identifiant invalide ne correspondra simplement à aucun compte. */
export function normalizeIdentifier(raw: string): string {
  return parseIdentifier(raw)?.value ?? String(raw ?? '').trim().toLowerCase();
}

/** Crée le tenant + son premier compte administrateur — un seul appel, avant toute session. */
export interface SignupInput {
  /** Optionnels : dérivés de l'identifiant si absents. */
  businessName?: string;
  adminName?: string;
  /** Identifiant de connexion : adresse email OU numéro de téléphone (voir parseIdentifier). */
  email: string;
  password: string;
  phone?: string;
  /** Mode choisi à l'installation : true = synchronise en ligne (accessible depuis le web), false = local uniquement. Défaut : true. */
  syncEnabled?: boolean;
  /** Clé d'activation remise à l'achat/inscription : démarre la période d'essai (ou la licence) du commerce. */
  activationKey?: string;
}

/** Licence d'un commerce : essai de 14 jours (clé `trial`) ou licence payante (clé `paid`). */
export const TRIAL_DAYS = 14;

/** `lifetime` = achat unique (8 000 DZD) : expiration repoussée à ~100 ans, jamais affichée comme un compte à rebours. */
export type LicenseKind = 'trial' | 'paid' | 'lifetime';
export const LIFETIME_DAYS = 36_500;

/**
 * Bail de licence : le serveur signe une licence valable `LICENSE_LEASE_DAYS` jours à la fois (`validUntil`) ;
 * le poste la renouvelle en ligne en arrière-plan. Une clé révoquée ou déliée n'est donc plus renouvelée et le
 * poste se verrouille — la licence ne reste jamais valide « à vie » hors-ligne.
 */
export const LICENSE_LEASE_DAYS = 30;
/** Le poste tente de renouveler dès qu'il reste moins que ça sur le bail (marge hors-ligne avant verrouillage). */
export const LICENSE_RENEW_BELOW_DAYS = 23;

export interface LicenseDTO {
  key: string;
  kind: LicenseKind;
  activatedAt: string;
  expiresAt: string;
  /** Fin du bail courant (≤ expiresAt). Absent sur les anciennes licences : valables jusqu'à expiresAt. */
  validUntil?: string;
}

/** Licence signée par le serveur (Ed25519) : le poste hors-ligne vérifie la signature avec la clé publique embarquée. */
export interface SignedLicense extends LicenseDTO {
  signature: string;
}

export interface LicenseStatusDTO {
  /** false = aucune clé activée sur ce commerce. */
  activated: boolean;
  kind?: LicenseKind;
  expiresAt?: string;
  /** Jours entiers restants (0 le dernier jour), négatif non renvoyé : voir `expired`. */
  daysLeft?: number;
  expired: boolean;
  /** true = la durée de la licence n'est pas écoulée mais le bail a expiré : se connecter à Internet pour renouveler. */
  needsOnline?: boolean;
  /** true = le serveur a refusé le renouvellement (clé révoquée ou liée à un autre poste). */
  denied?: boolean;
}

export interface AuthResult {
  license?: LicenseStatusDTO;
  token: string;
  tenantId: string;
  storeId?: string;
  user: { id: string; name: string; role: UserRole; canViewPurchasePrice?: boolean };
}

// --- Back-office équipe (cashier / stock_manager créés par l'admin) ---

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  active: boolean;
  hasPinCode: boolean;
  /** Un caissier peut-il voir le prix d'achat des produits ? Toujours false pour les autres rôles ici. */
  canViewPurchasePrice: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'cashier' | 'stock_manager'>;
  storeId?: string;
  pinCode?: string;
  /** Pertinent uniquement si role === 'cashier'. */
  canViewPurchasePrice?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  storeId?: string;
  active?: boolean;
  password?: string;
  pinCode?: string;
  canViewPurchasePrice?: boolean;
}

// --- Back-office paramètres du commerce (branding) ---

export interface TenantSettingsDTO {
  name: string;
  slug: string;
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  phone?: string;
  /** Identité légale imprimée sur les documents fiscaux (facture, bon de livraison, proforma). */
  legal: TenantLegalInfo;
  /** Régime fiscal : détermine quelle déclaration s'applique (G12 pour l'IFU, G50 pour le réel). */
  taxRegime: TaxRegime;
  /** true = synchronise en ligne, le commerce est accessible depuis le web ; false = local uniquement, aucune donnée ne quitte le poste. */
  syncEnabled: boolean;
}

/** `ifu` = impôt forfaitaire unique (déclaration G12) ; `real` = régime du réel (déclaration G50 mensuelle/trimestrielle). */
export type TaxRegime = 'ifu' | 'real';

export interface TenantLegalInfo {
  address?: string;
  rc?: string; // Registre de commerce
  nif?: string; // Numéro d'identification fiscale
  nis?: string; // Numéro d'identification statistique
  ai?: string; // Article d'imposition
}

export interface UpdateTenantSettingsInput {
  name?: string;
  phone?: string;
  legal?: TenantLegalInfo;
  taxRegime?: TaxRegime;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  syncEnabled?: boolean;
}

// --- Historique des prix d'achat par fournisseur ---

export interface PricePointDTO {
  date: string;
  unitCostCents: number;
  quantity: number;
}

export interface SupplierProductPriceDTO {
  productId: string;
  productName: string;
  points: PricePointDTO[]; // du plus ancien au plus récent
  latestCents: number;
  previousCents?: number;
  /** Variation du dernier achat par rapport au précédent, en % (positif = hausse). */
  changePct?: number;
  /** true = hausse >= PRICE_INCREASE_ALERT_PCT : à signaler au gérant. */
  alert: boolean;
}

export interface SupplierPriceHistoryDTO {
  products: SupplierProductPriceDTO[];
  alertCount: number;
}

export const PRICE_INCREASE_ALERT_PCT = 3;

export interface PurchaseCostRow {
  productId: string;
  productName: string;
  date: string;
  unitCostCents: number;
  quantity: number;
}

/** Regroupe les achats d'un fournisseur par produit et signale les hausses de prix. Partagé par l'API et le poste local. */
export function buildSupplierPriceHistory(rows: PurchaseCostRow[]): SupplierPriceHistoryDTO {
  const byProduct = new Map<string, PurchaseCostRow[]>();
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? [];
    list.push(r);
    byProduct.set(r.productId, list);
  }
  const products: SupplierProductPriceDTO[] = [];
  for (const list of byProduct.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const latest = list[list.length - 1];
    const prev = list.length > 1 ? list[list.length - 2] : undefined;
    const changePct = prev && prev.unitCostCents > 0 ? ((latest.unitCostCents - prev.unitCostCents) / prev.unitCostCents) * 100 : undefined;
    products.push({
      productId: latest.productId,
      productName: latest.productName,
      points: list.map((r) => ({ date: r.date, unitCostCents: r.unitCostCents, quantity: r.quantity })),
      latestCents: latest.unitCostCents,
      previousCents: prev?.unitCostCents,
      changePct: changePct === undefined ? undefined : Math.round(changePct * 10) / 10,
      alert: changePct !== undefined && changePct >= PRICE_INCREASE_ALERT_PCT,
    });
  }
  products.sort((a, b) => Number(b.alert) - Number(a.alert) || (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity) || a.productName.localeCompare(b.productName));
  return { products, alertCount: products.filter((p) => p.alert).length };
}

// --- Déclarations fiscales (G50 / G12) ---

/** Une ligne par taux de TVA, net des retours de la période. Montants TTC en base, HT/TVA dérivés ligne par ligne. */
export interface TaxRateBucketDTO {
  taxRate: number;
  baseHtCents: number;
  taxCents: number;
  ttcCents: number;
}

export interface TaxMonthPointDTO {
  /** AAAA-MM */
  month: string;
  ttcCents: number;
  baseHtCents: number;
  taxCents: number;
}

export interface TaxReturnDTO {
  byRate: TaxRateBucketDTO[];
  byMonth: TaxMonthPointDTO[];
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  /** Droit de timbre perçu (paiements espèces), net des retours. */
  stampDutyCents: number;
  /** Part encaissée en espèces (assiette du timbre). */
  cashCents: number;
  salesCount: number;
  refundsCount: number;
}

// --- Documents commerciaux (devis, bon de commande, proforma, bon de livraison, facture) ---

export type DocumentKind = 'quote' | 'order' | 'proforma' | 'delivery_note' | 'invoice';

export const DOCUMENT_KINDS: DocumentKind[] = ['quote', 'order', 'proforma', 'delivery_note', 'invoice'];

/** Préfixe du numéro : DV-2026-00001. Un compteur par (commerce, type, année), jamais réutilisé. */
export const DOCUMENT_PREFIX: Record<DocumentKind, string> = {
  quote: 'DV',
  order: 'BC',
  proforma: 'PF',
  delivery_note: 'BL',
  invoice: 'FA',
};

/** Transformations autorisées : un document n'est jamais modifié, on en émet un nouveau qui le référence. */
export const DOCUMENT_CONVERSIONS: Record<DocumentKind, DocumentKind[]> = {
  quote: ['order', 'proforma', 'delivery_note', 'invoice'],
  order: ['delivery_note', 'invoice'],
  proforma: ['order', 'delivery_note', 'invoice'],
  delivery_note: ['invoice'],
  invoice: [],
};

export function formatDocumentNumber(kind: DocumentKind, year: number, sequence: number): string {
  return `${DOCUMENT_PREFIX[kind]}-${year}-${String(sequence).padStart(5, '0')}`;
}

/** Année civile à l'heure d'Alger (UTC+1 toute l'année) : une facture émise le 31/12 à 23h30 reste de l'année en cours. */
export function documentYear(date: Date): number {
  return new Date(date.getTime() + 60 * 60 * 1000).getUTCFullYear();
}

/** Statut 'cancelled' = annulé mais numéro conservé (jamais de trou dans la séquence). */
export type DocumentStatus = 'issued' | 'cancelled';

/** Identité figée sur le document (vendeur comme acheteur) : ne change pas si la fiche tiers est modifiée ensuite. */
export interface DocumentParty {
  name: string;
  address?: string;
  nif?: string;
  rc?: string;
  nis?: string;
  ai?: string;
  customerId?: string;
}

export interface DocumentLineInput {
  productId?: string;
  designation: string;
  quantity: number;
  unit?: string;
  /** Prix unitaire hors taxe. */
  unitPriceHtCents: number;
  /** Remise sur la ligne, en centimes HT. */
  discountCents?: number;
  taxRate: TaxRate;
}

export interface DocumentLine extends DocumentLineInput {
  discountCents: number;
  totalHtCents: number;
  taxCents: number;
  totalTtcCents: number;
}

export interface DocumentVatBucket {
  taxRate: number;
  baseHtCents: number;
  taxCents: number;
}

export interface DocumentTotals {
  totalHtCents: number;
  vatByRate: DocumentVatBucket[];
  totalTaxCents: number;
  totalTtcCents: number;
  stampDutyCents: number;
  netToPayCents: number;
}

/**
 * Statut de la facturation électronique : le modèle est prêt, la transmission ne l'est pas encore.
 * Tant que l'administration n'a pas publié de format/API définitif, tout document reste 'not_submitted'.
 */
export type EInvoiceStatus = 'not_submitted' | 'pending' | 'submitted' | 'accepted' | 'rejected';

export interface EInvoiceInfo {
  status: EInvoiceStatus;
  /** Identifiant universel du document (UUID v4), stable et indépendant du numéro séquentiel — attendu par la plupart des schémas e-facture. */
  uuid: string;
  /** Référence attribuée par la plateforme de l'administration à l'acceptation. */
  externalReference?: string;
  submittedAt?: string;
  errorMessage?: string;
  /** Contenu du QR code de vérification, renseigné au retour de la plateforme. */
  qrPayload?: string;
}

export interface DocumentIntegrity {
  /** SHA-256 du contenu canonique du document (voir canonicalDocumentContent). */
  hash: string;
  /** Hash du document précédent de la même séquence : toute modification ou suppression rétroactive casse la chaîne. */
  previousHash?: string;
}

export interface BusinessDocumentDTO {
  id: string;
  kind: DocumentKind;
  number: string;
  year: number;
  sequence: number;
  status: DocumentStatus;
  issueDate: string;
  /** Devis / proforma : date limite de validité. Facture : échéance. */
  validUntil?: string;
  currency: 'DZD';
  seller: DocumentParty;
  buyer: DocumentParty;
  storeId?: string;
  lines: DocumentLine[];
  totals: DocumentTotals;
  paymentMethod?: PaymentMethod;
  /** Détail des règlements lorsque le document est issu d'une vente de caisse. */
  payments?: SalePayment[];
  notes?: string;
  /** Vente de caisse d'origine (facture / BL / proforma tirés d'un ticket). */
  saleId?: string;
  saleNumber?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdBy?: string;
  integrity: DocumentIntegrity;
  einvoice: EInvoiceInfo;
}

export interface DocumentListItemDTO {
  id: string;
  kind: DocumentKind;
  number: string;
  status: DocumentStatus;
  issueDate: string;
  buyerName: string;
  totalTtcCents: number;
  saleNumber?: string;
  sourceDocumentNumber?: string;
}

export interface CreateDocumentInput {
  kind: DocumentKind;
  buyer: DocumentParty;
  lines: DocumentLineInput[];
  storeId?: string;
  paymentMethod?: PaymentMethod;
  validUntil?: string;
  notes?: string;
}

export interface CreateDocumentFromSaleInput {
  saleId: string;
  kind: DocumentKind;
  buyer: DocumentParty;
}

export interface ConvertDocumentInput {
  kind: DocumentKind;
  /** Date de validité / échéance du nouveau document (facultatif). */
  validUntil?: string;
  /** Mode de règlement, utile pour le timbre d'une facture issue d'un devis ou d'une commande. */
  paymentMethod?: PaymentMethod;
}

export interface CancelDocumentInput {
  reason: string;
}

const taxOfTtc = (ttcCents: number, rate: number) => Math.round((ttcCents * rate) / (100 + rate));

/** Calcule les montants d'une ligne saisie en HT (devis, commande, facture libre). */
export function computeDocumentLine(input: DocumentLineInput): DocumentLine {
  const discountCents = Math.max(0, Math.round(input.discountCents ?? 0));
  const totalHtCents = Math.max(0, Math.round(input.quantity * input.unitPriceHtCents) - discountCents);
  const taxCents = Math.round((totalHtCents * input.taxRate) / 100);
  return { ...input, discountCents, totalHtCents, taxCents, totalTtcCents: totalHtCents + taxCents };
}

/**
 * Convertit une ligne de ticket de caisse (prix TTC, remise déjà déduite) en ligne de document.
 * Le TTC du ticket est conservé à l'identique : la TVA en est extraite, jamais recalculée par-dessus.
 */
export function documentLineFromSaleLine(line: SaleLine, locale: 'fr' | 'ar' = 'fr'): DocumentLine {
  const taxCents = taxOfTtc(line.lineTotalCents, line.taxRate);
  const totalHtCents = line.lineTotalCents - taxCents;
  return {
    productId: line.productId,
    designation: (locale === 'ar' && line.name.ar) || line.name.fr,
    quantity: line.quantity,
    unitPriceHtCents: line.quantity ? Math.round(totalHtCents / line.quantity) : 0,
    discountCents: 0,
    taxRate: line.taxRate,
    totalHtCents,
    taxCents,
    totalTtcCents: line.lineTotalCents,
  };
}

/**
 * Droit de timbre sur paiement en espèces (Code du timbre, barème par tranche de 100 DA ou fraction) :
 *  - <= 300 DA : exonéré
 *  - jusqu'à 30 000 DA : 1 DA / 100 DA  ·  30 000 – 100 000 DA : 1,5 DA / 100 DA  ·  > 100 000 DA : 2 DA / 100 DA
 *  - minimum de perception : 5 DA
 * ⚠ Barème à faire valider par le comptable du commerce : les taux changent avec les lois de finances.
 */
export function computeStampDutyCents(cashAmountCents: number): number {
  if (cashAmountCents <= 30_000) return 0;
  const units = Math.ceil(cashAmountCents / 10_000); // tranches de 100 DA
  const perUnitCents = cashAmountCents <= 3_000_000 ? 100 : cashAmountCents <= 10_000_000 ? 150 : 200;
  return Math.max(500, units * perUnitCents);
}

/** Totaux d'un document. Le timbre ne concerne que la part payée en espèces d'une facture. */
export function computeDocumentTotals(lines: DocumentLine[], stampDutyCents = 0): DocumentTotals {
  const buckets = new Map<number, DocumentVatBucket>();
  for (const l of lines) {
    const b = buckets.get(l.taxRate) ?? { taxRate: l.taxRate, baseHtCents: 0, taxCents: 0 };
    b.baseHtCents += l.totalHtCents;
    b.taxCents += l.taxCents;
    buckets.set(l.taxRate, b);
  }
  const vatByRate = [...buckets.values()].sort((a, b) => b.taxRate - a.taxRate);
  const totalHtCents = vatByRate.reduce((s, b) => s + b.baseHtCents, 0);
  const totalTaxCents = vatByRate.reduce((s, b) => s + b.taxCents, 0);
  const totalTtcCents = totalHtCents + totalTaxCents;
  return { totalHtCents, vatByRate, totalTaxCents, totalTtcCents, stampDutyCents, netToPayCents: totalTtcCents + stampDutyCents };
}

/**
 * Sérialisation déterministe (clés triées) du contenu fiscalement significatif d'un document —
 * c'est elle qui est hachée. Les champs de statut (annulation, e-facture) en sont exclus : ils
 * évoluent légitimement après l'émission sans altérer le document lui-même.
 */
export function canonicalDocumentContent(doc: Pick<BusinessDocumentDTO, 'kind' | 'number' | 'issueDate' | 'seller' | 'buyer' | 'lines' | 'totals' | 'saleNumber' | 'sourceDocumentNumber' | 'einvoice'>): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, sort(x)]));
    }
    return v;
  };
  return JSON.stringify(sort({
    kind: doc.kind, number: doc.number, issueDate: doc.issueDate, seller: doc.seller, buyer: doc.buyer,
    lines: doc.lines, totals: doc.totals, saleNumber: doc.saleNumber, sourceDocumentNumber: doc.sourceDocumentNumber,
    uuid: doc.einvoice.uuid,
  }));
}

// --- Export comptable (journal des ventes / récapitulatif TVA) ---

export type JournalEntryKind = 'sale' | 'refund' | 'invoice';

/**
 * Une écriture du journal : ticket de caisse, retour (montants négatifs) ou facture libre émise
 * hors caisse. Les factures tirées d'un ticket n'y figurent pas — le ticket est déjà dans le journal.
 */
export interface JournalEntryDTO {
  date: string;
  kind: JournalEntryKind;
  number: string;
  /** Numéro du document fiscal associé (facture tirée d'un ticket), s'il existe. */
  documentNumber?: string;
  storeId?: string;
  customerName?: string;
  customerNif?: string;
  vat: DocumentVatBucket[];
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  stampDutyCents: number;
  cashCents: number;
  paymentMethods: PaymentMethod[];
}

// --- Règles de validation communes aux deux backends (API cloud Mongo / serveur local SQLite) ---

/** Erreur métier d'un document : `status` est relayé tel quel au client (400 validation, 404 introuvable, 409 conflit). */
export class DocumentError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
  }
}

const DOC_VALID_RATES = new Set<number>([19, 9, 0]);
const DOC_PAYMENT_METHODS = new Set<string>(['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher']);
const docClean = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : undefined);

/** Validité par défaut d'un devis / d'une proforma, en jours. */
export const DEFAULT_DOCUMENT_VALIDITY_DAYS = 15;

export function assertDocumentKind(kind: unknown): asserts kind is DocumentKind {
  if (!DOCUMENT_KINDS.includes(kind as DocumentKind)) throw new DocumentError(400, 'Type de document invalide.');
}

export function assertPaymentMethod(method: unknown): void {
  if (method !== undefined && method !== null && method !== '' && !DOC_PAYMENT_METHODS.has(method as string)) {
    throw new DocumentError(400, 'Mode de règlement invalide.');
  }
}

export function cleanDocumentParty(raw: Partial<DocumentParty> | undefined): DocumentParty {
  return {
    name: docClean(raw?.name) ?? 'Client de passage',
    address: docClean(raw?.address),
    nif: docClean(raw?.nif),
    rc: docClean(raw?.rc),
    nis: docClean(raw?.nis),
    ai: docClean(raw?.ai),
    customerId: docClean(raw?.customerId),
  };
}

export function validateDocumentLines(raw: unknown): DocumentLine[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new DocumentError(400, 'Le document doit contenir au moins une ligne.');
  return raw.map((l, i) => {
    const n = i + 1;
    const designation = docClean(l?.designation);
    if (!designation) throw new DocumentError(400, `Ligne ${n} : désignation requise.`);
    if (!(typeof l.quantity === 'number' && l.quantity > 0)) throw new DocumentError(400, `Ligne ${n} : quantité invalide.`);
    if (!(Number.isInteger(l.unitPriceHtCents) && l.unitPriceHtCents >= 0)) throw new DocumentError(400, `Ligne ${n} : prix unitaire invalide.`);
    if (!DOC_VALID_RATES.has(l.taxRate)) throw new DocumentError(400, `Ligne ${n} : taux de TVA invalide (19, 9 ou 0).`);
    return computeDocumentLine({
      productId: docClean(l.productId),
      designation,
      quantity: l.quantity,
      unit: docClean(l.unit),
      unitPriceHtCents: l.unitPriceHtCents,
      discountCents: Number.isInteger(l.discountCents) && l.discountCents > 0 ? l.discountCents : 0,
      taxRate: l.taxRate,
    });
  });
}

export function parseDocumentDate(raw: unknown, label: string): Date | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) throw new DocumentError(400, `${label} invalide.`);
  return d;
}

export function cleanDocumentText(s: unknown): string | undefined {
  return docClean(s);
}

/** Le timbre ne s'applique qu'à une facture réglée (en tout ou partie) en espèces. */
export function documentStampDuty(kind: DocumentKind, ttcCents: number, paymentMethod?: PaymentMethod, payments?: SalePayment[]): number {
  if (kind !== 'invoice') return 0;
  if (payments?.length) {
    return computeStampDutyCents(payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amountCents, 0));
  }
  return paymentMethod === 'cash' ? computeStampDutyCents(ttcCents) : 0;
}

/** Document tirable d'un ticket de caisse. */
export const SALE_DERIVED_KINDS: DocumentKind[] = ['invoice', 'delivery_note', 'proforma'];

/** Écriture de journal d'un ticket de caisse (retour = montants négatifs). */
export function journalEntryFromSale(s: {
  date: string;
  type: 'sale' | 'refund';
  number: string;
  storeId?: string;
  lines: SaleLine[];
  payments: SalePayment[];
  stampDutyCents?: number;
  documentNumber?: string;
}): JournalEntryDTO {
  const sign = s.type === 'refund' ? -1 : 1;
  const map = new Map<number, DocumentVatBucket>();
  for (const l of s.lines) {
    const tax = taxOfTtc(l.lineTotalCents, l.taxRate);
    const b = map.get(l.taxRate) ?? { taxRate: l.taxRate, baseHtCents: 0, taxCents: 0 };
    b.baseHtCents += sign * (l.lineTotalCents - tax);
    b.taxCents += sign * tax;
    map.set(l.taxRate, b);
  }
  const vat = [...map.values()].sort((a, b) => b.taxRate - a.taxRate);
  const totalHtCents = vat.reduce((a, b) => a + b.baseHtCents, 0);
  const totalTaxCents = vat.reduce((a, b) => a + b.taxCents, 0);
  return {
    date: s.date,
    kind: s.type,
    number: s.number,
    documentNumber: s.documentNumber,
    storeId: s.storeId,
    vat,
    totalHtCents,
    totalTaxCents,
    totalTtcCents: totalHtCents + totalTaxCents,
    stampDutyCents: sign * (s.stampDutyCents ?? 0),
    cashCents: sign * s.payments.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amountCents, 0),
    paymentMethods: s.payments.map((p) => p.method),
  };
}

/** Écriture de journal d'une facture libre (émise hors caisse). */
export function journalEntryFromInvoice(d: Pick<BusinessDocumentDTO, 'issueDate' | 'number' | 'storeId' | 'buyer' | 'totals' | 'paymentMethod'>): JournalEntryDTO {
  return {
    date: d.issueDate,
    kind: 'invoice',
    number: d.number,
    storeId: d.storeId,
    customerName: d.buyer.name,
    customerNif: d.buyer.nif,
    vat: d.totals.vatByRate,
    totalHtCents: d.totals.totalHtCents,
    totalTaxCents: d.totals.totalTaxCents,
    totalTtcCents: d.totals.totalTtcCents,
    stampDutyCents: d.totals.stampDutyCents,
    cashCents: d.paymentMethod === 'cash' ? d.totals.totalTtcCents : 0,
    paymentMethods: d.paymentMethod ? [d.paymentMethod] : [],
  };
}
