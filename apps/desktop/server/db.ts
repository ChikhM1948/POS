import Database from 'better-sqlite3';

export type Db = Database.Database;

/**
 * Base locale embarquée (SQLite, un seul fichier) : transactionnelle, tolérante aux coupures de
 * courant (WAL) et sans aucun service à installer — adaptée à un poste de caisse hors-ligne.
 * Les montants sont des entiers (centimes) ; les dates sont des chaînes ISO 8601 UTC.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  branding TEXT NOT NULL DEFAULT '{}', legal TEXT NOT NULL DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT 'starter', status TEXT NOT NULL DEFAULT 'active',
  sync_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL,
  address TEXT, is_main_store INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, code)
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, name TEXT NOT NULL,
  email TEXT NOT NULL, password_hash TEXT NOT NULL, pin_code_hash TEXT,
  role TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, email)
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, sku TEXT NOT NULL, barcode TEXT,
  name_fr TEXT NOT NULL, name_ar TEXT, category TEXT, image_url TEXT, unit TEXT NOT NULL DEFAULT 'unité',
  variants TEXT NOT NULL DEFAULT '[]', selling_price_cents INTEGER NOT NULL,
  cost_price_cents INTEGER NOT NULL DEFAULT 0, min_selling_price_cents INTEGER,
  tax_rate INTEGER NOT NULL DEFAULT 19, is_perishable INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold REAL, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products (tenant_id, updated_at);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_updated ON customers (tenant_id, updated_at);
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT, address TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
  party_kind TEXT NOT NULL CHECK (party_kind IN ('customer','supplier')),
  party_id TEXT NOT NULL, type TEXT NOT NULL, amount_cents INTEGER NOT NULL, note TEXT,
  ref_type TEXT, ref_id TEXT, client_generated_id TEXT NOT NULL,
  created_at_local TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (tenant_id, client_generated_id)
);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger_entries (tenant_id, party_kind, party_id, created_at_local);
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT NOT NULL, register_id TEXT NOT NULL,
  cashier_id TEXT NOT NULL, number TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'sale', refund_of TEXT,
  lines TEXT NOT NULL, payments TEXT NOT NULL, totals TEXT NOT NULL,
  grand_total_cents INTEGER NOT NULL, tax_total_cents INTEGER NOT NULL, stamp_duty_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed', client_generated_id TEXT NOT NULL,
  created_at_local TEXT NOT NULL, synced_at TEXT, created_at TEXT NOT NULL,
  UNIQUE (tenant_id, client_generated_id)
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (tenant_id, store_id, created_at_local);
CREATE INDEX IF NOT EXISTS idx_sales_refund ON sales (tenant_id, refund_of);
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT NOT NULL, product_id TEXT NOT NULL,
  variant_sku TEXT, type TEXT NOT NULL, quantity_delta REAL NOT NULL, unit_cost_cents INTEGER,
  supplier_id TEXT, lot_number TEXT, expiry_date TEXT, note TEXT,
  source_type TEXT, source_id TEXT, client_generated_id TEXT NOT NULL,
  created_at_local TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (tenant_id, client_generated_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements (tenant_id, store_id, product_id);
CREATE TABLE IF NOT EXISTS sync_log (
  tenant_id TEXT NOT NULL, client_generated_id TEXT NOT NULL, device_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, status TEXT NOT NULL, error TEXT, received_at TEXT NOT NULL, applied_at TEXT,
  PRIMARY KEY (tenant_id, client_generated_id)
);
CREATE TABLE IF NOT EXISTS document_counters (
  tenant_id TEXT NOT NULL, kind TEXT NOT NULL, year INTEGER NOT NULL, last_sequence INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, kind, year)
);
CREATE TABLE IF NOT EXISTS business_documents (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, kind TEXT NOT NULL, number TEXT NOT NULL,
  year INTEGER NOT NULL, sequence INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'issued',
  issue_date TEXT NOT NULL, valid_until TEXT, seller TEXT NOT NULL, buyer TEXT NOT NULL, buyer_name TEXT NOT NULL,
  store_id TEXT, lines TEXT NOT NULL, totals TEXT NOT NULL, total_ttc_cents INTEGER NOT NULL,
  payment_method TEXT, payments TEXT, notes TEXT, sale_id TEXT, sale_number TEXT,
  source_document_id TEXT, source_document_number TEXT, cancelled_at TEXT, cancel_reason TEXT, created_by TEXT,
  hash TEXT NOT NULL, previous_hash TEXT, einvoice TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE (tenant_id, kind, year, sequence),
  UNIQUE (tenant_id, number)
);
CREATE INDEX IF NOT EXISTS idx_docs_date ON business_documents (tenant_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_docs_sale ON business_documents (tenant_id, sale_id, kind);
CREATE TABLE IF NOT EXISTS deleted_records (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, kind TEXT NOT NULL, ref_id TEXT NOT NULL, deleted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deleted_records ON deleted_records (tenant_id, kind, deleted_at);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export function openDatabase(file: string, nativeBinding?: string): Db {
  const db = new Database(file, nativeBinding ? { nativeBinding } : undefined);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL'); // un ticket validé ne doit jamais être perdu sur coupure de courant
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  // Migrations légères : colonnes ajoutées après la première version du schéma.
  const cols = (table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
  if (!cols('customers').includes('credit_limit_cents')) db.exec('ALTER TABLE customers ADD COLUMN credit_limit_cents INTEGER');
  const productCols = cols('products');
  for (const [col, type] of [['promo_price_cents', 'INTEGER'], ['promo_start', 'TEXT'], ['promo_end', 'TEXT'], ['sold_by_weight', 'INTEGER NOT NULL DEFAULT 0']] as const) {
    if (!productCols.includes(col)) db.exec(`ALTER TABLE products ADD COLUMN ${col} ${type}`);
  }
  return db;
}
