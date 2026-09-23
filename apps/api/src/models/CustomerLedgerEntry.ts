import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { LedgerEntryType } from '@pos-dz/shared';

/**
 * Append-only — implémente le ledger de crédit client ("Karna") anticipé dans Customer.ts et
 * docs/ARCHITECTURE.md#5. amountCents > 0 augmente ce que le client nous doit (vente à crédit),
 * < 0 le réduit (paiement reçu).
 */
export interface ICustomerLedgerEntry extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  type: LedgerEntryType;
  amountCents: number;
  note?: string;
  reference?: { type: 'sale' | 'purchase' | 'manual'; id: Types.ObjectId };
  clientGeneratedId: string;
  createdAtLocal: Date;
}

const CustomerLedgerEntrySchema = new Schema<ICustomerLedgerEntry>(
  {
    customerId: { type: Schema.Types.ObjectId, required: true, ref: 'Customer' },
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

CustomerLedgerEntrySchema.plugin(tenantScopePlugin);
CustomerLedgerEntrySchema.index({ tenantId: 1, clientGeneratedId: 1 }, { unique: true });
CustomerLedgerEntrySchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export const CustomerLedgerEntry = model<ICustomerLedgerEntry>('CustomerLedgerEntry', CustomerLedgerEntrySchema);
