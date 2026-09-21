import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * Identité du client. Le solde de crédit ("Karna") n'est PAS un champ mutable ici — même
 * principe que StockMovement : suivi via un ledger d'écritures à part (CustomerLedgerEntry,
 * à ajouter au même modèle append-only le jour où le crédit client est implémenté), pour
 * rester cohérent en cas de ventes à crédit concurrentes saisies hors-ligne.
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
