import { Schema, model, Document, Types } from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope';
import type { UserRole } from '@pos-dz/shared';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  pinCodeHash?: string; // connexion rapide au poste de caisse
  role: UserRole;
  permissions: string[]; // dérogations fines au-delà du rôle
  active: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    pinCodeHash: String,
    role: {
      type: String,
      enum: ['super_admin', 'store_admin', 'cashier', 'stock_manager'],
      required: true,
    },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

UserSchema.plugin(tenantScopePlugin);
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', UserSchema);
