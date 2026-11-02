import { Schema, model, Document, Types } from 'mongoose';

/**
 * Clé d'activation émise par l'éditeur (voir POST /license/generate). Le premier usage (`redeemedAt`)
 * démarre le compte à rebours : `expiresAt = redeemedAt + durationDays` (14 jours pour un essai).
 * Pas de plugin tenantScope : une clé existe avant que le commerce n'ait un tenantId.
 */
export interface ILicense extends Document {
  key: string;
  kind: 'trial' | 'paid' | 'lifetime';
  durationDays: number;
  note?: string;
  revoked: boolean;
  redeemedAt?: Date;
  expiresAt?: Date;
  /** Commerce (cloud) ou poste (desktop) auquel la clé est liée au premier usage. */
  boundTo?: string;
  tenantId?: Types.ObjectId;
  createdAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    kind: { type: String, enum: ['trial', 'paid', 'lifetime'], default: 'trial' },
    durationDays: { type: Number, required: true },
    note: String,
    revoked: { type: Boolean, default: false },
    redeemedAt: Date,
    expiresAt: Date,
    boundTo: String,
    tenantId: Schema.Types.ObjectId,
  },
  { timestamps: true },
);

export const License = model<ILicense>('License', LicenseSchema);
