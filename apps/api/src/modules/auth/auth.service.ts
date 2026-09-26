import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Tenant } from '../../models/Tenant';
import { Store } from '../../models/Store';
import { env } from '../../config/env';
import { PERMISSION_VIEW_PURCHASE_PRICE } from '@pos-dz/shared';
import type { AuthResult, JwtClaims, SignupInput } from '@pos-dz/shared';

function canViewPurchasePrice(user: { permissions?: string[] }): boolean {
  return Boolean(user.permissions?.includes(PERMISSION_VIEW_PURCHASE_PRICE));
}

function signToken(claims: JwtClaims): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(claims, env.jwtSecret, options);
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'commerce'
  );
}

/**
 * Premier lancement d'un commerce : crée le tenant, sa boutique principale et son premier compte
 * administrateur (`store_admin`) en une seule opération, avant toute session existante. C'est ce
 * compte qui pourra ensuite provisionner les caissiers/gestionnaires de stock via /users.
 */
export async function signupTenant(input: SignupInput): Promise<AuthResult> {
  const baseSlug = slugify(input.businessName);
  let slug = baseSlug;
  for (let i = 2; await Tenant.exists({ slug }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  const tenant = await Tenant.create({
    name: input.businessName.trim(),
    slug,
    legal: input.phone ? { phone: input.phone.trim() } : undefined,
    syncEnabled: input.syncEnabled ?? true,
  });

  const store = await Store.create({
    tenantId: tenant._id,
    name: 'Boutique principale',
    code: 'MAIN',
    isMainStore: true,
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    tenantId: tenant._id,
    storeId: store._id,
    name: input.adminName.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    role: 'store_admin',
  });

  const claims: JwtClaims = {
    sub: String(user._id),
    tenantId: String(tenant._id),
    storeId: String(store._id),
    role: user.role,
  };
  return {
    token: signToken(claims),
    tenantId: String(tenant._id),
    storeId: String(store._id),
    user: { id: String(user._id), name: user.name, role: user.role },
  };
}

/** Login back-office standard : email + mot de passe, tous rôles. */
export async function loginWithPassword(tenantId: string, email: string, password: string) {
  const user = await User.findOne({ tenantId, email: email.toLowerCase(), active: true });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const claims: JwtClaims = {
    sub: String(user._id),
    tenantId: String(user.tenantId),
    storeId: user.storeId ? String(user.storeId) : undefined,
    role: user.role,
    canViewPurchasePrice: canViewPurchasePrice(user),
  };
  return { token: signToken(claims), user: { id: user._id, name: user.name, role: user.role, canViewPurchasePrice: canViewPurchasePrice(user) } };
}

/**
 * Login caisse par email + mot de passe — alternative au PIN sur le même écran (voir LoginForm
 * côté POS). Comme loginWithPin, restreint au rôle `cashier` : un store_admin/stock_manager doit
 * passer par le back-office (/auth/login), pas par la caisse.
 */
export async function loginCashierWithPassword(tenantId: string, email: string, password: string) {
  const user = await User.findOne({ tenantId, email: email.toLowerCase(), role: 'cashier', active: true });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const claims: JwtClaims = {
    sub: String(user._id),
    tenantId: String(user.tenantId),
    storeId: user.storeId ? String(user.storeId) : undefined,
    role: user.role,
    canViewPurchasePrice: canViewPurchasePrice(user),
  };
  return { token: signToken(claims), user: { id: user._id, name: user.name, role: user.role, canViewPurchasePrice: canViewPurchasePrice(user) } };
}

/**
 * Login rapide au poste de caisse : PIN court, réservé aux comptes `cashier` provisionnés par un
 * admin (voir /admin/team). Restreint explicitement au rôle cashier — un stock_manager ou un
 * admin ne doit pas pouvoir ouvrir une session de vente via ce raccourci, même s'il a un PIN.
 */
export async function loginWithPin(tenantId: string, storeId: string, pinCode: string) {
  const candidates = await User.find({ tenantId, storeId, role: 'cashier', active: true, pinCodeHash: { $exists: true } });

  for (const user of candidates) {
    const valid = await bcrypt.compare(pinCode, user.pinCodeHash!);
    if (valid) {
      const claims: JwtClaims = {
        sub: String(user._id),
        tenantId,
        storeId,
        role: user.role,
        canViewPurchasePrice: canViewPurchasePrice(user),
      };
      return {
        token: signToken(claims),
        user: { id: user._id, name: user.name, role: user.role, canViewPurchasePrice: canViewPurchasePrice(user) },
      };
    }
  }
  return null;
}
