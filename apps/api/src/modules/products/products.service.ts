import { Types } from 'mongoose';
import { Product } from '../../models/Product';
import type { ProductDTO, ProductInput } from '@pos-dz/shared';

function toDTO(doc: any): ProductDTO {
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
    taxRate: doc.taxRate,
    isPerishable: doc.isPerishable,
    lowStockThreshold: doc.lowStockThreshold,
    active: doc.active,
  };
}

export async function listProducts(tenantId: string, search?: string): Promise<ProductDTO[]> {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ 'name.fr': regex }, { 'name.ar': regex }, { sku: regex }, { barcode: regex }];
  }
  const docs = await Product.find(filter).sort({ 'name.fr': 1 }).lean();
  return docs.map(toDTO);
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

/** Pas de suppression physique : un produit peut être référencé par des ventes/mouvements passés. */
export async function deactivateProduct(tenantId: string, productId: string): Promise<boolean> {
  const result = await Product.updateOne(
    { tenantId: new Types.ObjectId(tenantId), _id: productId },
    { $set: { active: false } },
  );
  return result.matchedCount > 0;
}
