import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { StockMovementType } from '@pos-dz/shared';

/**
 * Ledger append-only : le stock courant n'est jamais un champ muté directement.
 * Voir docs/DATA_MODEL.md#stockmovement — c'est ce qui rend la synchro multi-caisses
 * sans conflit (deux mouvements concurrents s'additionnent au lieu de s'écraser).
 */
export interface IStockMovement extends Document {
  tenantId: Types.ObjectId;
  storeId: Types.ObjectId;
  productId: Types.ObjectId;
  variantSku?: string;
  type: StockMovementType;
  quantityDelta: number; // signé : positif = entrée, négatif = sortie
  unitCostCents?: number; // requis pour type='purchase', sert au calcul du PUMP
  supplierId?: Types.ObjectId; // renseigné pour type='purchase' — sert à la dette fournisseur
  lotNumber?: string;
  expiryDate?: Date;
  note?: string; // saisi manuellement en back-office (ex. "inventaire annuel", "casse")
  sourceDocument?: {
    type: 'sale' | 'transfer' | 'manual';
    id: Types.ObjectId;
  };
  clientGeneratedId: string; // idempotence sync
  createdAtLocal: Date; // horodatage du poste de caisse (peut différer du serveur)
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    storeId: { type: Schema.Types.ObjectId, required: true, ref: 'Store' },
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    variantSku: String,
    type: {
      type: String,
      enum: [
        'purchase',
        'sale',
        'refund',
        'adjustment',
        'transfer_in',
        'transfer_out',
        'inventory_count',
        'spoilage',
      ],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    unitCostCents: Number,
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    lotNumber: String,
    expiryDate: Date,
    note: String,
    sourceDocument: {
      type: { type: String, enum: ['sale', 'transfer', 'manual'] },
      id: Schema.Types.ObjectId,
    },
    clientGeneratedId: { type: String, required: true },
    createdAtLocal: { type: Date, required: true },
  },
  { timestamps: true },
);

StockMovementSchema.plugin(tenantScopePlugin);
StockMovementSchema.index({ tenantId: 1, clientGeneratedId: 1 }, { unique: true });
StockMovementSchema.index({ tenantId: 1, storeId: 1, productId: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>('StockMovement', StockMovementSchema);
