import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * rawContent fige le rendu tel qu'imprimé la première fois (buffer ESC/POS encodé base64
 * ou image raster), pour qu'une réimpression reste identique même si le branding du tenant
 * a changé depuis. Voir apps/web/lib/print/.
 */
export interface IReceipt extends Document {
  tenantId: Types.ObjectId;
  saleId: Types.ObjectId;
  format: '80mm' | '58mm';
  rawContent: string;
  printedAt: Date;
  reprintCount: number;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    saleId: { type: Schema.Types.ObjectId, required: true, ref: 'Sale' },
    format: { type: String, enum: ['80mm', '58mm'], required: true },
    rawContent: { type: String, required: true },
    printedAt: { type: Date, required: true },
    reprintCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ReceiptSchema.plugin(tenantScopePlugin);
ReceiptSchema.index({ tenantId: 1, saleId: 1 });

export const Receipt = model<IReceipt>('Receipt', ReceiptSchema);
