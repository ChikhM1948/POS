import { Schema, model, Document } from 'mongoose';

/**
 * Compte « super administrateur » de l'éditeur (celui qui émet les clés d'activation du POS desktop).
 * Volontairement hors de User : pas de tenantId, et jamais utilisable comme session de commerce
 * (jeton signé avec un secret distinct, voir modules/license/platformAdmin.service.ts).
 * Pas de plugin tenantScope : il n'appartient à aucun commerce.
 */
export interface IPlatformAdmin extends Document {
  email: string;
  name: string;
  passwordHash: string;
  active: boolean;
}

const PlatformAdminSchema = new Schema<IPlatformAdmin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const PlatformAdmin = model<IPlatformAdmin>('PlatformAdmin', PlatformAdminSchema);
