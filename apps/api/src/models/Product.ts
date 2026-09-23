import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { TaxRate, LocalizedText, ProductVariant } from '@pos-dz/shared';

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  sku: string;
  barcode?: string;
  name: LocalizedText;
  category?: string;
  imageUrl?: string;
  unit: string; // 'unité', 'kg', 'litre', ...
  variants: ProductVariant[];
  sellingPriceCents: number;
  costPriceCents: number;
  minMarginCents?: number;
  taxRate: TaxRate;
  isPerishable: boolean;
  lowStockThreshold?: number; // alerte de seuil critique — voir docs/ARCHITECTURE.md
  active: boolean;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true, sparse: true },
    name: {
      fr: { type: String, required: true },
      ar: String,
    },
    category: String,
    imageUrl: String,
    unit: { type: String, default: 'unité' },
    variants: [
      {
        _id: false,
        sku: { type: String, required: true },
        barcode: String,
        attributes: { type: Map, of: String },
        priceOverrideCents: Number,
      },
    ],
    sellingPriceCents: { type: Number, required: true, min: 0 },
    // Moyenne pondérée recalculée à chaque achat fournisseur (voir stock.service.recomputeCostPrice) —
    // pas un ledger à part : contrairement au stock, une valeur "en cache, recalculable" suffit ici et
    // évite de rejouer tout StockMovement pour connaître le coût courant à la caisse (y compris hors-ligne).
    costPriceCents: { type: Number, default: 0, min: 0 },
    minMarginCents: { type: Number, min: 0 },
    taxRate: { type: Number, enum: [19, 9, 0], default: 19 },
    isPerishable: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProductSchema.plugin(tenantScopePlugin);
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, barcode: 1 });

export const Product = model<IProduct>('Product', ProductSchema);
