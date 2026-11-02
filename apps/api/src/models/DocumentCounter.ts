import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/** Dernier numéro attribué par (commerce, type de document, année). Incrémenté atomiquement ($inc). */
export interface IDocumentCounter extends Document {
  tenantId: Types.ObjectId;
  kind: string;
  year: number;
  lastSequence: number;
}

const DocumentCounterSchema = new Schema<IDocumentCounter>({
  kind: { type: String, required: true },
  year: { type: Number, required: true },
  lastSequence: { type: Number, required: true, default: 0 },
});

DocumentCounterSchema.plugin(tenantScopePlugin);
DocumentCounterSchema.index({ tenantId: 1, kind: 1, year: 1 }, { unique: true });

export const DocumentCounter = model<IDocumentCounter>('DocumentCounter', DocumentCounterSchema);
