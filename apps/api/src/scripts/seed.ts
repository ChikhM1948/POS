import bcrypt from 'bcryptjs';
import { connectDB } from '../db/connect';
import { Tenant } from '../models/Tenant';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { Product } from '../models/Product';

/** Jeu de données minimal pour tester la caisse en local : un tenant, une boutique, deux users, trois produits. */
async function seed() {
  await connectDB();

  const tenant = await Tenant.findOneAndUpdate(
    { slug: 'epicerie-demo' },
    {
      $setOnInsert: {
        name: 'Épicerie Demo',
        slug: 'epicerie-demo',
        branding: { primaryColor: '#0f172a', secondaryColor: '#38bdf8', receiptHeader: 'Épicerie Demo', receiptFooter: 'Merci de votre visite !' },
        legal: { rc: '16/00-1234567B24', nif: '000116123456789', nis: '001612345678', ai: '16123456789' },
        locale: { defaultLanguage: 'fr', currency: 'DZD' },
        plan: 'starter',
        status: 'trial',
      },
    },
    { upsert: true, new: true },
  );

  const store = await Store.findOneAndUpdate(
    { tenantId: tenant._id, code: 'ALG01' },
    { $setOnInsert: { tenantId: tenant._id, name: 'Boutique Alger Centre', code: 'ALG01', isMainStore: true } },
    { upsert: true, new: true },
  );

  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  await User.findOneAndUpdate(
    { tenantId: tenant._id, email: 'admin@epicerie-demo.dz' },
    { $setOnInsert: { tenantId: tenant._id, storeId: store._id, name: 'Amine (Admin)', email: 'admin@epicerie-demo.dz', passwordHash: adminPasswordHash, role: 'store_admin' } },
    { upsert: true },
  );

  const cashierPinHash = await bcrypt.hash('1234', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier1234', 10);
  await User.findOneAndUpdate(
    { tenantId: tenant._id, email: 'caissier@epicerie-demo.dz' },
    { $setOnInsert: { tenantId: tenant._id, storeId: store._id, name: 'Sara (Caissière)', email: 'caissier@epicerie-demo.dz', passwordHash: cashierPasswordHash, pinCodeHash: cashierPinHash, role: 'cashier' } },
    { upsert: true },
  );

  const products = [
    { sku: 'PRD-001', barcode: '6130001000019', name: { fr: 'Lait 1L', ar: 'حليب 1 لتر' }, category: 'Boissons', sellingPriceCents: 12000, taxRate: 9 as const, unit: 'unité' },
    { sku: 'PRD-002', barcode: '6130001000026', name: { fr: 'Pain', ar: 'خبز' }, category: 'Boulangerie', sellingPriceCents: 3000, taxRate: 0 as const, unit: 'unité' },
    { sku: 'PRD-003', barcode: '6130001000033', name: { fr: 'Huile 1L', ar: 'زيت 1 لتر' }, category: 'Épicerie', sellingPriceCents: 45000, taxRate: 19 as const, unit: 'unité' },
    { sku: 'PRD-004', barcode: '6130001000040', name: { fr: 'Eau minérale 1.5L', ar: 'مياه معدنية 1.5 لتر' }, category: 'Boissons', sellingPriceCents: 4000, taxRate: 9 as const, unit: 'unité' },
    { sku: 'PRD-005', barcode: '6130001000057', name: { fr: 'Croissant', ar: 'كرواسان' }, category: 'Boulangerie', sellingPriceCents: 3500, taxRate: 9 as const, unit: 'unité' },
    { sku: 'PRD-006', barcode: '6130001000064', name: { fr: 'Sucre 1kg', ar: 'سكر 1 كغ' }, category: 'Épicerie', sellingPriceCents: 15000, taxRate: 19 as const, unit: 'kg' },
    { sku: 'PRD-007', barcode: '6130001000071', name: { fr: 'Savon liquide', ar: 'صابون سائل' }, category: 'Hygiène', sellingPriceCents: 25000, taxRate: 19 as const, unit: 'unité' },
    { sku: 'PRD-008', barcode: '6130001000088', name: { fr: 'Dentifrice', ar: 'معجون أسنان' }, category: 'Hygiène', sellingPriceCents: 32000, taxRate: 19 as const, unit: 'unité' },
  ];

  for (const p of products) {
    await Product.findOneAndUpdate(
      { tenantId: tenant._id, sku: p.sku },
      { $setOnInsert: { tenantId: tenant._id, variants: [], isPerishable: false, active: true, ...p } },
      { upsert: true },
    );
  }

  console.log('Seed terminé.');
  console.log(`  tenantId: ${tenant._id}`);
  console.log(`  storeId:  ${store._id}`);
  console.log('  admin:    admin@epicerie-demo.dz / admin1234');
  console.log('  caissier: caissier@epicerie-demo.dz / cashier1234 (PIN caisse: 1234)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Échec du seed:', err);
  process.exit(1);
});
