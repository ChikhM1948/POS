import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { SaleLine, SalePayment, SaleTotals } from '@pos-dz/shared';

/**
 * Une vente est immuable une fois créée. Un retour crée une nouvelle Sale (type='refund')
 * liée via refundOf — on ne modifie jamais une vente existante.
 */
export interface ISale extends Document {
  tenantId: Types.ObjectId;
  storeId: Types.ObjectId;
  registerId: string;
  cashierId: Types.ObjectId;
  number: string; // ex. "ALG01-R2-00456", généré localement, unique sans coordination réseau
  type: 'sale' | 'refund';
  refundOf?: Types.ObjectId;
  lines: SaleLine[];
  payments: SalePayment[];
  totals: SaleTotals;
  status: 'completed' | 'voided';
  clientGeneratedId: string; // idempotence sync
  createdAtLocal: Date;
  syncedAt?: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    storeId: { type: Schema.Types.ObjectId, required: true, ref: 'Store' },
    registerId: { type: String, required: true },
    cashierId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    number: { type: String, required: true },
    type: { type: String, enum: ['sale', 'refund'], default: 'sale' },
    refundOf: { type: Schema.Types.ObjectId, ref: 'Sale' },
    lines: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        variantSku: String,
        name: { fr: String, ar: String },
        quantity: { type: Number, required: true },
        unitPriceCents: { type: Number, required: true },
        taxRate: { type: Number, enum: [19, 9, 0], required: true },
        discountCents: { type: Number, default: 0 },
        lineTotalCents: { type: Number, required: true },
      },
    ],
    payments: [
      {
        _id: false,
        method: { type: String, enum: ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'], required: true },
        amountCents: { type: Number, required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
        reference: String,
      },
    ],
    totals: {
      subtotalCents: { type: Number, required: true },
      taxTotalCents: { type: Number, required: true },
      stampDutyCents: { type: Number, default: 0 },
      discountTotalCents: { type: Number, default: 0 },
      grandTotalCents: { type: Number, required: true },
    },
    status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
    clientGeneratedId: { type: String, required: true },
    createdAtLocal: { type: Date, required: true },
    syncedAt: Date,
  },
  { timestamps: true },
);

SaleSchema.plugin(tenantScopePlugin);
SaleSchema.index({ tenantId: 1, clientGeneratedId: 1 }, { unique: true });
SaleSchema.index({ tenantId: 1, storeId: 1, createdAtLocal: -1 });

export const Sale = model<ISale>('Sale', SaleSchema);
