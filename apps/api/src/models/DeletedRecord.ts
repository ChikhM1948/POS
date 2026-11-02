import { Schema, model, Document, Types } from 'mongoose';

/**
 * Pierre tombale d'une suppression définitive. Le pull de synchronisation ne renvoie que les lignes
 * modifiées depuis le dernier passage : sans cette trace, un produit supprimé resterait indéfiniment
 * dans le cache hors-ligne des caisses. Voir pullChangesSince (sync.service.ts).
 */
export interface IDeletedRecord extends Document {
  tenantId: Types.ObjectId;
  kind: 'product';
  refId: Types.ObjectId;
  deletedAt: Date;
}

const DeletedRecordSchema = new Schema<IDeletedRecord>({
  tenantId: { type: Schema.Types.ObjectId, required: true },
  kind: { type: String, enum: ['product'], required: true },
  refId: { type: Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: Date.now },
});

DeletedRecordSchema.index({ tenantId: 1, kind: 1, deletedAt: 1 });

export const DeletedRecord = model<IDeletedRecord>('DeletedRecord', DeletedRecordSchema);
