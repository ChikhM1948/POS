import { Schema, model, Document, Types } from 'mongoose';

/** Commande de licence payée en ligne via SofizPay. La licence n'est émise qu'une fois le paiement confirmé. */
export interface ILicensePayment extends Document {
  orderId: string;
  tenantId: Types.ObjectId;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  cibOrderId?: string;
  sofizTxId?: string;
  licenseKey?: string;
  paidAt?: Date;
  createdAt: Date;
}

const LicensePaymentSchema = new Schema<ILicensePayment>(
  {
    orderId: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    cibOrderId: String,
    sofizTxId: String,
    licenseKey: String,
    paidAt: Date,
  },
  { timestamps: true },
);

export const LicensePayment = model<ILicensePayment>('LicensePayment', LicensePaymentSchema);
