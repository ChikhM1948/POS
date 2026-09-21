import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * Un point de vente physique. `code` est court et stable (ex. "ALG01") — il entre dans la
 * numérotation locale des tickets hors-ligne, voir docs/ARCHITECTURE.md#4.
 */
export interface IStore extends Document {
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  isMainStore: boolean;
  active: boolean;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    address: String,
    isMainStore: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

StoreSchema.plugin(tenantScopePlugin);
StoreSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const Store = model<IStore>('Store', StoreSchema);
