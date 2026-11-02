import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { DocumentKind, DocumentLine, DocumentParty, DocumentStatus, DocumentTotals, EInvoiceInfo, PaymentMethod, SalePayment } from '@pos-dz/shared';

/**
 * Document commercial émis (devis, commande, proforma, BL, facture). Immuable une fois émis :
 * seuls `status` (annulation) et `einvoice` (suivi de transmission) évoluent. Un numéro n'est jamais
 * réattribué — un document annulé garde le sien, d'où l'absence de suppression.
 */
export interface IBusinessDocument extends Document {
  tenantId: Types.ObjectId;
  kind: DocumentKind;
  number: string;
  year: number;
  sequence: number;
  status: DocumentStatus;
  issueDate: Date;
  validUntil?: Date;
  currency: 'DZD';
  seller: DocumentParty;
  buyer: DocumentParty;
  storeId?: Types.ObjectId;
  lines: DocumentLine[];
  totals: DocumentTotals;
  paymentMethod?: PaymentMethod;
  payments?: SalePayment[];
  notes?: string;
  saleId?: Types.ObjectId;
  saleNumber?: string;
  sourceDocumentId?: Types.ObjectId;
  sourceDocumentNumber?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdBy?: Types.ObjectId;
  integrity: { hash: string; previousHash?: string };
  einvoice: EInvoiceInfo;
}

const PartySchema = new Schema(
  { name: String, address: String, nif: String, rc: String, nis: String, ai: String, customerId: String },
  { _id: false },
);

const BusinessDocumentSchema = new Schema<IBusinessDocument>(
  {
    kind: { type: String, enum: ['quote', 'order', 'proforma', 'delivery_note', 'invoice'], required: true },
    number: { type: String, required: true },
    year: { type: Number, required: true },
    sequence: { type: Number, required: true },
    status: { type: String, enum: ['issued', 'cancelled'], default: 'issued' },
    issueDate: { type: Date, required: true },
    validUntil: Date,
    currency: { type: String, enum: ['DZD'], default: 'DZD' },
    seller: { type: PartySchema, required: true },
    buyer: { type: PartySchema, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    lines: [
      {
        _id: false,
        productId: String,
        designation: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: String,
        unitPriceHtCents: { type: Number, required: true },
        discountCents: { type: Number, default: 0 },
        taxRate: { type: Number, enum: [19, 9, 0], required: true },
        totalHtCents: { type: Number, required: true },
        taxCents: { type: Number, required: true },
        totalTtcCents: { type: Number, required: true },
      },
    ],
    totals: {
      totalHtCents: Number,
      vatByRate: [{ _id: false, taxRate: Number, baseHtCents: Number, taxCents: Number }],
      totalTaxCents: Number,
      totalTtcCents: Number,
      stampDutyCents: { type: Number, default: 0 },
      netToPayCents: Number,
    },
    paymentMethod: { type: String, enum: ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'] },
    payments: [{ _id: false, method: String, amountCents: Number, customerId: String, reference: String }],
    notes: String,
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
    saleNumber: String,
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'BusinessDocument' },
    sourceDocumentNumber: String,
    cancelledAt: Date,
    cancelReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    integrity: { hash: { type: String, required: true }, previousHash: String },
    einvoice: {
      status: { type: String, enum: ['not_submitted', 'pending', 'submitted', 'accepted', 'rejected'], default: 'not_submitted' },
      uuid: { type: String, required: true },
      externalReference: String,
      submittedAt: Date,
      errorMessage: String,
      qrPayload: String,
    },
  },
  { timestamps: true },
);

BusinessDocumentSchema.plugin(tenantScopePlugin);
// Garde-fou ultime : deux documents ne peuvent jamais partager un numéro, même en cas de course.
BusinessDocumentSchema.index({ tenantId: 1, kind: 1, year: 1, sequence: 1 }, { unique: true });
BusinessDocumentSchema.index({ tenantId: 1, number: 1 }, { unique: true });
BusinessDocumentSchema.index({ tenantId: 1, issueDate: -1 });
BusinessDocumentSchema.index({ tenantId: 1, saleId: 1, kind: 1 });

export const BusinessDocument = model<IBusinessDocument>('BusinessDocument', BusinessDocumentSchema);
