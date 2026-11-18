import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { PERMISSION_VIEW_PURCHASE_PRICE, parseIdentifier } from '@pos-dz/shared';
import { User } from '../../models/User';
import { requireAuth, invalidateAuthCache, type AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { signToken } from './auth.service';
import { rateLimit } from '../../middleware/rateLimit';

export const accountRouter = Router();
accountRouter.use(requireAuth);

const accountDTO = (user: any) => ({ id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? undefined });
const fail = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };

accountRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findOne({ _id: req.auth!.sub, tenantId: req.auth!.tenantId, active: true });
  if (!user) return fail(401, 'Compte introuvable.');
  res.json({ account: accountDTO(user) });
}));

accountRouter.patch('/', rateLimit({ windowMs: 15 * 60_000, max: 10, key: (req: AuthenticatedRequest) => req.auth!.sub }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, phone } = req.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) return fail(400, 'Le mot de passe actuel est requis.');
  if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72)) {
    return fail(400, 'Le nouveau mot de passe doit contenir au moins 6 caractères et au maximum 72 octets.');
  }
  if (phone !== undefined && typeof phone !== 'string') return fail(400, 'Numéro de téléphone invalide.');
  const parsedPhone = phone?.trim() ? parseIdentifier(phone) : null;
  if (phone?.trim() && parsedPhone?.kind !== 'phone') return fail(400, 'Numéro de téléphone invalide.');
  if (phone === undefined && newPassword === undefined) return fail(400, 'Aucune modification fournie.');

  const user = await User.findOne({ _id: req.auth!.sub, tenantId: req.auth!.tenantId, active: true });
  if (!user) return fail(401, 'Compte introuvable.');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return fail(400, 'Le mot de passe actuel est incorrect.');
  const normalizedPhone = parsedPhone?.value;
  if (normalizedPhone && await User.exists({ _id: { $ne: user._id }, $or: [{ email: normalizedPhone }, { phone: normalizedPhone }] }).setOptions({ skipTenantScope: true })) {
    return fail(409, 'Ce numéro de téléphone est déjà utilisé par un autre compte.');
  }
  const changes: Record<string, unknown> = {};
  if (newPassword !== undefined) changes.passwordHash = await bcrypt.hash(newPassword, 10);
  if (phone !== undefined && normalizedPhone) changes.phone = normalizedPhone;
  let updated;
  try {
    updated = await User.findOneAndUpdate({
      _id: user._id, tenantId: user.tenantId, active: true, passwordHash: user.passwordHash,
      $or: [{ tokenVersion: user.tokenVersion ?? 0 }, { tokenVersion: { $exists: false } }],
    }, {
      $set: changes, $inc: { tokenVersion: 1 },
      ...(phone !== undefined && !normalizedPhone ? { $unset: { phone: 1 } } : {}),
    }, { new: true });
  } catch (error: any) {
    if (error?.code === 11000) return fail(409, 'Ce numéro de téléphone est déjà utilisé par un autre compte.');
    throw error;
  }
  if (!updated) return fail(409, 'Le compte a changé. Reconnectez-vous puis réessayez.');
  invalidateAuthCache(String(updated._id));
  const token = signToken({
    sub: String(updated._id), tenantId: String(updated.tenantId),
    storeId: updated.storeId ? String(updated.storeId) : undefined, role: updated.role,
    canViewPurchasePrice: updated.permissions.includes(PERMISSION_VIEW_PURCHASE_PRICE), tv: updated.tokenVersion,
  });
  res.json({ account: accountDTO(updated), token });
}));
