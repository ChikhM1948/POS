import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../../models/User';
import { Store } from '../../models/Store';
import { PERMISSION_VIEW_PURCHASE_PRICE } from '@pos-dz/shared';
import type { CreateUserInput, UpdateUserInput, UserDTO } from '@pos-dz/shared';

const MANAGED_ROLES = ['cashier', 'stock_manager'] as const;

function toDTO(u: any): UserDTO {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    storeId: u.storeId ? String(u.storeId) : undefined,
    active: u.active,
    hasPinCode: Boolean(u.pinCodeHash),
    canViewPurchasePrice: Boolean(u.permissions?.includes(PERMISSION_VIEW_PURCHASE_PRICE)),
  };
}

/** Équipe gérée par l'admin depuis le back-office — n'inclut pas les comptes admin eux-mêmes. */
export async function listUsers(tenantId: string): Promise<UserDTO[]> {
  const docs = await User.find({ tenantId: new Types.ObjectId(tenantId), role: { $in: MANAGED_ROLES } })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(toDTO);
}

export async function createUser(tenantId: string, input: CreateUserInput): Promise<UserDTO> {
  // Le login PIN caisse (auth.service.loginWithPin) filtre par storeId — sans boutique assignée,
  // un caissier créé depuis le back-office ne pourrait jamais ouvrir de session en caisse.
  // Faute de boutique explicite, on rattache à la boutique principale du commerce.
  let storeId = input.storeId;
  if (!storeId) {
    const mainStore = await Store.findOne({ tenantId: new Types.ObjectId(tenantId), isMainStore: true }).lean();
    storeId = mainStore ? String(mainStore._id) : undefined;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const pinCodeHash = input.pinCode ? await bcrypt.hash(input.pinCode, 10) : undefined;
  const user = await User.create({
    tenantId: new Types.ObjectId(tenantId),
    storeId: storeId ? new Types.ObjectId(storeId) : undefined,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    pinCodeHash,
    role: input.role,
    permissions: input.canViewPurchasePrice ? [PERMISSION_VIEW_PURCHASE_PRICE] : [],
  });
  return toDTO(user);
}

export async function updateUser(tenantId: string, id: string, input: UpdateUserInput): Promise<UserDTO | null> {
  const user = await User.findOne({ tenantId: new Types.ObjectId(tenantId), _id: id });
  if (!user) return null;
  if (input.name !== undefined) user.name = input.name.trim();
  if (input.storeId !== undefined) user.storeId = new Types.ObjectId(input.storeId);
  if (input.active !== undefined) user.active = input.active;
  if (input.password) user.passwordHash = await bcrypt.hash(input.password, 10);
  if (input.pinCode) user.pinCodeHash = await bcrypt.hash(input.pinCode, 10);
  if (input.canViewPurchasePrice !== undefined) {
    user.permissions = input.canViewPurchasePrice ? [PERMISSION_VIEW_PURCHASE_PRICE] : [];
  }
  await user.save();
  return toDTO(user);
}

/** Pas de suppression physique : conserve l'historique (ventes, mouvements de stock) attribué à ce compte. */
export async function deactivateUser(tenantId: string, id: string): Promise<boolean> {
  const result = await User.updateOne(
    { tenantId: new Types.ObjectId(tenantId), _id: id },
    { $set: { active: false } },
  );
  return result.matchedCount > 0;
}
