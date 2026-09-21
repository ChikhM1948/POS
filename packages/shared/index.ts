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
}

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
  type: Extract<StockMovementType, 'purchase' | 'adjustment' | 'inventory_count' | 'spoilage'>;
  quantityDelta: number;
  unitCostCents?: number;
  lotNumber?: string;
  expiryDate?: string;
  note?: string;
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

// --- Auth : création du commerce (premier lancement) & connexion ---

/** Crée le tenant + son premier compte administrateur — un seul appel, avant toute session. */
export interface SignupInput {
  businessName: string;
  adminName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResult {
  token: string;
  tenantId: string;
  storeId?: string;
  user: { id: string; name: string; role: UserRole };
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
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'cashier' | 'stock_manager'>;
  storeId?: string;
  pinCode?: string;
}

export interface UpdateUserInput {
  name?: string;
  storeId?: string;
  active?: boolean;
  password?: string;
  pinCode?: string;
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
}

export interface UpdateTenantSettingsInput {
  name?: string;
  phone?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}
