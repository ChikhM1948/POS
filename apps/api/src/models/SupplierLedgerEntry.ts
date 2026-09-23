import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { LedgerEntryType } from '@pos-dz/shared';

/**
 * Append-only, même principe que StockMovement (voir docs/DATA_MODEL.md#stockmovement) : la dette
 * envers un fournisseur n'est jamais un solde muté, mais la somme signée de ces écritures.
 * amountCents > 0 augmente la dette (achat non payé intégralement), < 0 la réduit (paiement).
 */
export interface ISupplierLedgerEntry extends Document {
  tenantId: Types.ObjectId;
  supplierId: Types.ObjectId;
  type: LedgerEntryType;
  amountCents: number;
  note?: string;
  reference?: { type: 'sale' | 'purchase' | 'manual'; id: Types.ObjectId };
  clientGeneratedId: string;
  createdAtLocal: Date;
}

const SupplierLedgerEntrySchema = new Schema<ISupplierLedgerEntry>(
  {
    supplierId: { type: Schema.Types.ObjectId, required: true, ref: 'Supplier' },
    type: { type: String, enum: ['purchase_on_credit', 'sale_credit', 'payment', 'adjustment'], required: true },
    amountCents: { type: Number, required: true },
    note: String,
    reference: {
      type: { type: String, enum: ['sale', 'purchase', 'manual'] },
      id: Schema.Types.ObjectId,
    },
    clientGeneratedId: { type: String, required: true },
    createdAtLocal: { type: Date, required: true },
  },
  { timestamps: true },
);

SupplierLedgerEntrySchema.plugin(tenantScopePlugin);
SupplierLedgerEntrySchema.index({ tenantId: 1, clientGeneratedId: 1 }, { unique: true });
SupplierLedgerEntrySchema.index({ tenantId: 1, supplierId: 1, createdAt: -1 });

export const SupplierLedgerEntry = model<ISupplierLedgerEntry>('SupplierLedgerEntry', SupplierLedgerEntrySchema);
