import { Types } from 'mongoose';
import { Product } from '../../models/Product';
import type { ProductDTO, ProductInput } from '@pos-dz/shared';

// canViewPurchasePrice=false (caissier sans PERMISSION_VIEW_PURCHASE_PRICE, voir products.controller.ts)
// redige le prix d'achat côté serveur : masquer le champ seulement dans le formulaire admin
// (ProductForm) ne suffit pas, la réponse JSON brute reste inspectable (devtools/network).
function toDTO(doc: any, canViewPurchasePrice = true): ProductDTO {
  return {
    id: String(doc._id),
    sku: doc.sku,
    barcode: doc.barcode,
    name: doc.name,
    category: doc.category,
    imageUrl: doc.imageUrl,
    unit: doc.unit,
    variants: doc.variants ?? [],
    sellingPriceCents: doc.sellingPriceCents,
    costPriceCents: canViewPurchasePrice ? doc.costPriceCents ?? 0 : 0,
    minSellingPriceCents: doc.minSellingPriceCents,
    promoPriceCents: doc.promoPriceCents ?? undefined,
    promoStart: doc.promoStart ? new Date(doc.promoStart).toISOString() : undefined,
    promoEnd: doc.promoEnd ? new Date(doc.promoEnd).toISOString() : undefined,
    soldByWeight: doc.soldByWeight ?? false,
    taxRate: doc.taxRate,
    isPerishable: doc.isPerishable,
    lowStockThreshold: doc.lowStockThreshold,
    active: doc.active,
  };
}

export async function listProducts(tenantId: string, search?: string, canViewPurchasePrice = true): Promise<ProductDTO[]> {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ 'name.fr': regex }, { 'name.ar': regex }, { sku: regex }, { barcode: regex }];
  }
  const docs = await Product.find(filter).sort({ 'name.fr': 1 }).lean();
  return docs.map((doc) => toDTO(doc, canViewPurchasePrice));
}

export async function createProduct(tenantId: string, input: ProductInput): Promise<ProductDTO> {
  const doc = await Product.create({ tenantId: new Types.ObjectId(tenantId), ...input });
  return toDTO(doc);
}

export async function updateProduct(tenantId: string, productId: string, input: Partial<ProductInput>): Promise<ProductDTO | null> {
  const doc = await Product.findOneAndUpdate(
    { tenantId: new Types.ObjectId(tenantId), _id: productId },
    { $set: input },
    { new: true },
  );
  return doc ? toDTO(doc) : null;
}

/**
 * Moyenne pondérée incrémentale du coût d'achat : pas besoin de rejouer tout le ledger
 * StockMovement, seul le solde de stock courant (avant la réception) est nécessaire. Si le stock
 * était à 0 ou négatif (rupture), le nouveau coût remplace simplement l'ancien.
 */
export async function recomputeCostPrice(
  tenantId: string,
  productId: string,
  currentQtyBeforePurchase: number,
  purchaseQty: number,
  purchaseUnitCostCents: number,
): Promise<number> {
  const product = await Product.findOne({ tenantId: new Types.ObjectId(tenantId), _id: productId });
  if (!product) throw new Error('Produit introuvable.');

  const priorQty = Math.max(0, currentQtyBeforePurchase);
  const newCostPriceCents =
    priorQty > 0
      ? Math.round((priorQty * (product.costPriceCents ?? 0) + purchaseQty * purchaseUnitCostCents) / (priorQty + purchaseQty))
      : purchaseUnitCostCents;

  product.costPriceCents = newCostPriceCents;
  await product.save();
  return newCostPriceCents;
}

/** Pas de suppression physique : un produit peut être référencé par des ventes/mouvements passés. */
export async function deactivateProduct(tenantId: string, productId: string): Promise<boolean> {
  const result = await Product.updateOne(
    { tenantId: new Types.ObjectId(tenantId), _id: productId },
    { $set: { active: false } },
  );
  return result.matchedCount > 0;
}

export type PermanentDeleteResult = { status: 'deleted' | 'not_found' } | { status: 'blocked'; reason: 'sales' | 'documents' | 'stock' };

/**
 * Suppression définitive — réservée aux produits sans historique (créés par erreur, jamais vendus).
 * Refusée si une vente, un document commercial ou un mouvement de stock autre que l'ajustement
 * (stock initial) le référence : l'historique comptable doit rester lisible. Les ajustements sont
 * supprimés avec le produit, et une pierre tombale part au pull pour purger les caches des caisses.
 */
export async function deleteProductPermanently(tenantId: string, productId: string): Promise<PermanentDeleteResult> {
  const [{ Sale }, { StockMovement }, { BusinessDocument }, { DeletedRecord }] = await Promise.all([
    import('../../models/Sale'),
    import('../../models/StockMovement'),
    import('../../models/BusinessDocument'),
    import('../../models/DeletedRecord'),
  ]);
  const tenantOid = new Types.ObjectId(tenantId);
  const productOid = new Types.ObjectId(productId);

  if (!(await Product.exists({ tenantId: tenantOid, _id: productOid }))) return { status: 'not_found' };
  if (await Sale.exists({ tenantId: tenantOid, 'lines.productId': productOid })) return { status: 'blocked', reason: 'sales' };
  if (await BusinessDocument.exists({ tenantId: tenantOid, 'lines.productId': productId })) return { status: 'blocked', reason: 'documents' };
  if (await StockMovement.exists({ tenantId: tenantOid, productId: productOid, type: { $ne: 'adjustment' } })) return { status: 'blocked', reason: 'stock' };

  await StockMovement.deleteMany({ tenantId: tenantOid, productId: productOid, type: 'adjustment' });
  await Product.deleteOne({ tenantId: tenantOid, _id: productOid });
  await DeletedRecord.create({ tenantId: tenantOid, kind: 'product', refId: productOid });
  return { status: 'deleted' };
}
