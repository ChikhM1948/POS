import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * Identité du client. Le solde de crédit ("Karna") n'est PAS un champ mutable ici — même
 * principe que StockMovement : suivi via le ledger append-only CustomerLedgerEntry (voir
 * apps/api/src/models/CustomerLedgerEntry.ts), pour rester cohérent en cas de ventes à crédit
 * concurrentes saisies hors-ligne.
 */
export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone?: string;
  active: boolean;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CustomerSchema.plugin(tenantScopePlugin);
CustomerSchema.index({ tenantId: 1, phone: 1 });

export const Customer = model<ICustomer>('Customer', CustomerSchema);
