import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Tenant } from '../../models/Tenant';
import { Store } from '../../models/Store';
import { env } from '../../config/env';
import { Types } from 'mongoose';
import { getTenantLicenseStatus, redeemKey, statusOf } from '../license/license.service';
import { PERMISSION_VIEW_PURCHASE_PRICE, normalizeIdentifier, parseIdentifier } from '@pos-dz/shared';
import type { AuthResult, JwtClaims, SignupInput } from '@pos-dz/shared';

function canViewPurchasePrice(user: { permissions?: string[] }): boolean {
  return Boolean(user.permissions?.includes(PERMISSION_VIEW_PURCHASE_PRICE));
}

function signToken(claims: JwtClaims): string {
  // JWT_EXPIRES_IN=never : token sans expiration (postes installés).
  if (env.jwtExpiresIn === 'never') return jwt.sign(claims, env.jwtSecret);
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
  const identifier = parseIdentifier(input.email);
  if (!identifier) {
    throw Object.assign(new Error('Saisissez une adresse email ou un numéro de téléphone valide.'), { status: 400 });
  }
  // `email` désigne l'identifiant de connexion : email OU téléphone (normalisé).
  const email = identifier.value;
  // Le login se fait par identifiant seul (sans identifiant de commerce) : il doit donc être unique.
  if (await User.exists({ email }).setOptions({ skipTenantScope: true })) {
    throw Object.assign(new Error('Un compte existe déjà avec cet identifiant.'), { status: 409 });
  }
  const phone = input.phone?.trim() || (identifier.kind === 'phone' ? email : undefined);
  const localPart = (identifier.kind === 'email' ? email.split('@')[0] : '') || 'commerce';
  const businessName = input.businessName?.trim() || localPart;
  const adminName = input.adminName?.trim() || localPart;

  const baseSlug = slugify(businessName);
  let slug = baseSlug;
  for (let i = 2; await Tenant.exists({ slug }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  // La clé est consommée AVANT la création du commerce (une clé invalide ne laisse rien derrière elle) ;
  // elle est liée à l'_id pré-généré du futur tenant.
  const tenantId = new Types.ObjectId();
  const license = await redeemKey(input.activationKey ?? '', `tenant:${tenantId}`, String(tenantId));

  const tenant = await Tenant.create({
    _id: tenantId,
    license,
    status: license.kind === 'paid' ? 'active' : 'trial',
    name: businessName,
    slug,
    legal: phone ? { phone } : undefined,
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
    name: adminName,
    email,
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
    license: statusOf(license),
  };
}

/** Login back-office standard : email + mot de passe, tous rôles. */
export async function loginWithPassword(tenantId: string | undefined, email: string, password: string) {
  const filter: Record<string, unknown> = { email: normalizeIdentifier(email), active: true };
  if (tenantId) filter.tenantId = tenantId;
  // Sans tenantId (login par email seul), le plugin tenantScope refuserait la requête : on l'ignore
  // explicitement ici, l'email étant unique globalement.
  const matches = await User.find(filter).setOptions({ skipTenantScope: !tenantId }).limit(2);
  if (matches.length !== 1) {
    console.warn(`[auth] %s: %d compte(s) pour %s (tenant=%s)`, 'loginWithPassword', matches.length, email, tenantId ?? '-');
    return null;
  }
  const user = matches[0];

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.warn(`[auth] %s: mot de passe incorrect pour %s`, 'loginWithPassword', email);
    return null;
  }

  const claims: JwtClaims = {
    sub: String(user._id),
    tenantId: String(user.tenantId),
    storeId: user.storeId ? String(user.storeId) : undefined,
    role: user.role,
    canViewPurchasePrice: canViewPurchasePrice(user),
  };
  const license = await getTenantLicenseStatus(claims.tenantId);
  return { token: signToken(claims), tenantId: String(user.tenantId), license, user: { id: user._id, name: user.name, role: user.role, canViewPurchasePrice: canViewPurchasePrice(user) } };
}

/**
 * Login caisse par email + mot de passe — alternative au PIN sur le même écran (voir LoginForm
 * côté POS). Comme loginWithPin, restreint au rôle `cashier` : un store_admin/stock_manager doit
 * passer par le back-office (/auth/login), pas par la caisse.
 */
export async function loginCashierWithPassword(tenantId: string | undefined, email: string, password: string) {
  // tenantId optionnel : l'email est unique (voir signup), comme pour loginWithPassword.
  const filter: Record<string, unknown> = { email: normalizeIdentifier(email), role: 'cashier', active: true };
  if (tenantId) filter.tenantId = tenantId;
  // Sans tenantId (login par email seul), le plugin tenantScope refuserait la requête : on l'ignore
  // explicitement ici, l'email étant unique globalement.
  const matches = await User.find(filter).setOptions({ skipTenantScope: !tenantId }).limit(2);
  if (matches.length !== 1) {
    console.warn(`[auth] %s: %d compte(s) pour %s (tenant=%s)`, 'loginCashierWithPassword', matches.length, email, tenantId ?? '-');
    return null;
  }
  const user = matches[0];

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.warn(`[auth] %s: mot de passe incorrect pour %s`, 'loginCashierWithPassword', email);
    return null;
  }

  const claims: JwtClaims = {
    sub: String(user._id),
    tenantId: String(user.tenantId),
    storeId: user.storeId ? String(user.storeId) : undefined,
    role: user.role,
    canViewPurchasePrice: canViewPurchasePrice(user),
  };
  return { token: signToken(claims), user: { id: user._id, tenantId: claims.tenantId, storeId: claims.storeId, name: user.name, role: user.role, canViewPurchasePrice: canViewPurchasePrice(user) } };
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
