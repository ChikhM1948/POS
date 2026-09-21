import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';

/**
 * Journal d'audit côté serveur de toutes les opérations reçues des postes de caisse.
 * Ne pilote pas la logique métier (l'upsert idempotent sur Sale/StockMovement le fait déjà) —
 * sert au diagnostic et à la détection d'anomalies (device qui rejoue une opération rejetée).
 */
export interface ISyncQueueEntry extends Document {
  tenantId: Types.ObjectId;
  deviceId: string;
  entityType: 'sale' | 'stockMovement';
  clientGeneratedId: string;
  status: 'pending' | 'applied' | 'rejected';
  receivedAt: Date;
  appliedAt?: Date;
  error?: string;
}

const SyncQueueSchema = new Schema<ISyncQueueEntry>(
  {
    deviceId: { type: String, required: true },
    entityType: { type: String, enum: ['sale', 'stockMovement'], required: true },
    clientGeneratedId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'applied', 'rejected'], default: 'pending' },
    receivedAt: { type: Date, default: Date.now },
    appliedAt: Date,
    error: String,
  },
  { timestamps: true },
);

SyncQueueSchema.plugin(tenantScopePlugin);
SyncQueueSchema.index({ tenantId: 1, clientGeneratedId: 1 }, { unique: true });
SyncQueueSchema.index({ tenantId: 1, deviceId: 1, status: 1 });

export const SyncQueue = model<ISyncQueueEntry>('SyncQueue', SyncQueueSchema);
