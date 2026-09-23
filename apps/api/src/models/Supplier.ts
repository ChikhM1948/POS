import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * Identité du fournisseur. Comme pour Customer, le solde dû ("dette fournisseur") n'est PAS un
 * champ mutable ici — il est suivi via le ledger append-only SupplierLedgerEntry.
 */
export interface ISupplier extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  active: boolean;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    phone: { type: String, trim: true },
    address: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SupplierSchema.plugin(tenantScopePlugin);
SupplierSchema.index({ tenantId: 1, phone: 1 });

export const Supplier = model<ISupplier>('Supplier', SupplierSchema);
