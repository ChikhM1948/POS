import { randomBytes, createPrivateKey, sign } from 'node:crypto';
import { Types } from 'mongoose';
import { License } from '../../models/License';
import { Tenant } from '../../models/Tenant';
import { LicensePayment } from '../../models/LicensePayment';
import { createSofizpayOrder, checkSofizpayPayment } from './sofizpay';
import { env } from '../../config/env';
import { TRIAL_DAYS, LIFETIME_DAYS, LICENSE_LEASE_DAYS } from '@pos-dz/shared';
import type { LicenseKind, LicenseStatusDTO, SignedLicense } from '@pos-dz/shared';

const DAY_MS = 86_400_000;
// Sans I/O/0/1 : les clés sont dictées par téléphone / recopiées à la main.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

export function newKey(): string {
  const bytes = randomBytes(16);
  const groups = [0, 1, 2, 3].map((g) => Array.from(bytes.subarray(g * 4, g * 4 + 4), (b) => ALPHABET[b % ALPHABET.length]).join(''));
  return `POS-${groups.join('-')}`;
}

export async function generateKeys(count: number, kind: LicenseKind, durationDays: number | undefined, note?: string) {
  const days = durationDays ?? (kind === 'trial' ? TRIAL_DAYS : kind === 'lifetime' ? LIFETIME_DAYS : 365);
  const docs = Array.from({ length: Math.min(Math.max(count, 1), 200) }, () => ({ key: newKey(), kind, durationDays: days, note }));
  await License.insertMany(docs);
  return docs.map((d) => ({ key: d.key, kind: d.kind, durationDays: d.durationDays }));
}

/** Révoque une clé et, si elle est déjà liée à un commerce, l'expire immédiatement chez lui. */
export async function revokeKey(rawKey: string) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  const lic = await License.findOneAndUpdate({ key }, { revoked: true, expiresAt: new Date() }, { new: true });
  if (!lic) fail(404, 'Clé introuvable.');
  if (lic.tenantId) await Tenant.updateOne({ _id: lic.tenantId, 'license.key': lic.key }, { $set: { 'license.expiresAt': lic.expiresAt } });
  return lic;
}

/**
 * Délie une clé de son poste (réinstallation, nouveau PC). Réservé aux clés liées à un poste : une clé liée à un
 * commerce cloud, ou un essai, ne se déplace pas. L'expiration reste celle du premier usage.
 */
export async function resetKeyBinding(rawKey: string) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  const lic = await License.findOneAndUpdate(
    { key, revoked: false, kind: { $ne: 'trial' }, boundTo: /^device:/ },
    { $unset: { boundTo: 1 } },
    { new: true },
  );
  if (!lic) fail(409, "Cette clé ne peut pas être déliée (inconnue, révoquée, essai, ou non liée à un poste).");
  return lic;
}

/** Liste des clés pour le tableau de bord super admin (les plus récentes d'abord). */
export async function listKeys(filter: { kind?: string; state?: string; q?: string }, limit = 200) {
  const query: Record<string, unknown> = {};
  if (filter.kind === 'trial' || filter.kind === 'paid' || filter.kind === 'lifetime') query.kind = filter.kind;
  if (filter.state === 'unused') Object.assign(query, { redeemedAt: { $exists: false }, revoked: false });
  else if (filter.state === 'used') Object.assign(query, { redeemedAt: { $exists: true }, revoked: false });
  else if (filter.state === 'revoked') query.revoked = true;
  const q = filter.q?.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ key: rx }, { note: rx }];
  }
  const rows = await License.find(query).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean();
  const ids = [...new Set(rows.map((l) => l.assignedTenantId && String(l.assignedTenantId)).filter(Boolean))] as string[];
  const names = new Map((await Tenant.find({ _id: { $in: ids } }).select('name').lean()).map((t) => [String(t._id), t.name]));
  return rows.map((l) => ({
    key: l.key, kind: l.kind, durationDays: l.durationDays, note: l.note, revoked: l.revoked,
    redeemedAt: l.redeemedAt, expiresAt: l.expiresAt, boundTo: l.boundTo, createdAt: l.createdAt,
    assignedTenantId: l.assignedTenantId ? String(l.assignedTenantId) : undefined,
    assignedTenantName: l.assignedTenantId ? names.get(String(l.assignedTenantId)) : undefined,
  }));
}

/** Recherche de commerces par nom / slug (liste déroulante du super admin). */
export async function searchTenants(q?: string, limit = 20) {
  const term = q?.trim();
  const query = term ? { $or: ['name', 'slug'].map((f) => ({ [f]: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })) } : {};
  const rows = await Tenant.find(query).select('name slug status').sort({ name: 1 }).limit(Math.min(limit, 50)).lean();
  return rows.map((t) => ({ id: String(t._id), name: t.name, slug: t.slug, status: t.status }));
}

/** Réserve une clé à un commerce (ou lève la réservation avec tenantId = null). */
export async function assignKeyToTenant(rawKey: string, tenantId: string | null) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  if (tenantId) {
    if (!Types.ObjectId.isValid(tenantId) || !(await Tenant.exists({ _id: tenantId }))) fail(404, 'Commerce introuvable.');
    const lic = await License.findOne({ key });
    if (!lic) fail(404, 'Clé introuvable.');
    if (lic.revoked) fail(409, 'Clé révoquée.');
    if (lic.tenantId && String(lic.tenantId) !== tenantId) fail(409, 'Cette clé est déjà utilisée par un autre commerce.');
    lic.assignedTenantId = tenantId as any;
    await lic.save();
    return;
  }
  if (!(await License.findOneAndUpdate({ key }, { $unset: { assignedTenantId: 1 } }))) fail(404, 'Clé introuvable.');
}

/**
 * Signature Ed25519 du contenu de la licence — vérifiée hors-ligne par le poste desktop.
 * Le bail (`validUntil`) est borné par l'expiration réelle ; l'ordre des champs fait partie de la signature.
 */
export function signLicense(l: { key: string; kind: LicenseKind; activatedAt: Date; expiresAt: Date }): SignedLicense {
  if (!env.licensePrivateKey) fail(503, 'Serveur de licences non configuré (LICENSE_PRIVATE_KEY).');
  // Licence à vie : activation en ligne UNE fois, puis aucun renouvellement obligatoire (bail = expiration réelle).
  const validUntil = l.kind === 'lifetime' ? l.expiresAt : new Date(Math.min(l.expiresAt.getTime(), Date.now() + LICENSE_LEASE_DAYS * DAY_MS));
  const payload = { key: l.key, kind: l.kind, activatedAt: l.activatedAt.toISOString(), expiresAt: l.expiresAt.toISOString(), validUntil: validUntil.toISOString() };
  const signature = sign(null, Buffer.from(JSON.stringify(payload)), createPrivateKey(env.licensePrivateKey)).toString('base64');
  return { ...payload, signature };
}

/**
 * Renouvelle le bail d'un poste. Refusé (404/409) si la clé est inconnue, révoquée, ou n'est plus liée à CE poste
 * (déliée par le super admin ou reprise par un autre) : le poste se verrouille alors.
 */
export async function renewLease(rawKey: string, deviceId: string) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  const lic = await License.findOne({ key });
  if (!lic || lic.revoked || !lic.redeemedAt || !lic.expiresAt) fail(404, "Clé d'activation invalide ou révoquée.");
  if (lic.boundTo !== `device:${deviceId}`) fail(409, "Cette clé n'est plus liée à ce poste.");
  return { key: lic.key, kind: lic.kind, activatedAt: lic.redeemedAt, expiresAt: lic.expiresAt };
}

/**
 * Consomme une clé. Idempotent pour le même `boundTo` (réactivation après réinstallation / second appel) ;
 * une clé déjà liée à un autre commerce/poste est refusée. L'expiration est fixée au premier usage.
 */
export async function redeemKey(rawKey: string, boundTo: string, tenantId?: string) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  if (!key) fail(400, "Clé d'activation requise.");
  const now = new Date();
  if (tenantId) {
    const reserved = await License.findOne({ key }).select('assignedTenantId').lean();
    if (reserved?.assignedTenantId && String(reserved.assignedTenantId) !== String(tenantId)) fail(403, 'Cette clé est réservée à un autre commerce.');
  }
  // Prise de possession atomique : une clé neuve est liée au premier appelant, même si deux requêtes arrivent
  // en même temps (un seul `findOneAndUpdate` peut matcher `redeemedAt` absent). Une clé = un seul commerce/poste.
  let lic = await License.findOneAndUpdate(
    { key, revoked: false, redeemedAt: { $exists: false } },
    [{ $set: { redeemedAt: now, boundTo, expiresAt: { $add: [now, { $multiply: ['$durationDays', DAY_MS] }] } } }],
    { new: true },
  );
  if (!lic && boundTo.startsWith('device:')) {
    // Clé « déliée » par le super admin (réinstallation) : le premier poste qui la ressaisit la reprend, atomiquement.
    // L'expiration d'origine est conservée : délier ne prolonge jamais une licence.
    lic = await License.findOneAndUpdate(
      { key, revoked: false, redeemedAt: { $exists: true }, boundTo: { $exists: false } },
      { $set: { boundTo } },
      { new: true },
    );
  }
  if (!lic) {
    lic = await License.findOne({ key });
    if (!lic || lic.revoked) fail(404, "Clé d'activation invalide.");
    if (lic.boundTo !== boundTo) fail(409, "Cette clé est déjà utilisée par un autre commerce ou poste.");
  }
  if (tenantId && !lic.tenantId) {
    lic.tenantId = tenantId as any;
    await lic.save();
  }
  return { key: lic.key, kind: lic.kind, activatedAt: lic.redeemedAt!, expiresAt: lic.expiresAt! };
}

/** Lie la clé au tenant : en cas de prolongation par une clé payante, on garde la plus lointaine expiration. */
export async function applyLicenseToTenant(tenantId: string, lic: { key: string; kind: LicenseKind; activatedAt: Date; expiresAt: Date }) {
  // Ne jamais raccourcir : une clé d'essai ne remplace pas une licence plus longue (ex. à vie).
  const current = await Tenant.findById(tenantId).select('license').lean();
  if (current?.license?.expiresAt && current.license.expiresAt >= lic.expiresAt) return;
  await Tenant.updateOne({ _id: tenantId }, { $set: { license: lic, status: lic.kind === 'trial' ? 'trial' : 'active' } });
}

export function statusOf(license?: { kind?: LicenseKind; expiresAt?: Date } | null): LicenseStatusDTO {
  if (!license?.expiresAt) return { activated: false, expired: true };
  const ms = license.expiresAt.getTime() - Date.now();
  return { activated: true, kind: license.kind, expiresAt: license.expiresAt.toISOString(), daysLeft: Math.max(0, Math.ceil(ms / DAY_MS)), expired: ms <= 0 };
}

/**
 * Statut du commerce. Les commerces créés avant l'introduction des licences (aucun champ `license`)
 * reçoivent un essai de 14 jours à partir de leur premier contrôle plutôt qu'un verrouillage immédiat.
 */
export async function getTenantLicenseStatus(tenantId: string): Promise<LicenseStatusDTO> {
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) return { activated: false, expired: true };
  if (!tenant.license?.expiresAt) {
    const now = new Date();
    const lic = { kind: 'trial' as const, activatedAt: now, expiresAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS) };
    await Tenant.updateOne({ _id: tenantId, 'license.expiresAt': { $exists: false } }, { $set: { license: lic, status: 'trial' } });
    return statusOf(lic);
  }
  return statusOf(tenant.license);
}

/** Active / prolonge la licence d'un commerce existant avec une nouvelle clé. */
export async function activateForTenant(tenantId: string, rawKey: string): Promise<LicenseStatusDTO> {
  const lic = await redeemKey(rawKey, `tenant:${tenantId}`, tenantId);
  await applyLicenseToTenant(tenantId, lic);
  return statusOf(lic);
}

/** Démarre un paiement SofizPay pour une licence à vie ; renvoie l'URL de paiement hébergée (CIB / Dahabia). */
export async function startCheckout(tenantId: string, customer: { name?: string; email?: string; phone?: string }) {
  const amount = env.lifetimePriceDzd;
  const orderId = `POS-${tenantId.slice(-6).toUpperCase()}-${Date.now()}`;
  const gw = await createSofizpayOrder({ amount, orderId, label: 'Licence POS a vie', ...customer });
  if (!gw.ok) fail(gw.status, gw.code === 'not_configured' ? 'Paiement en ligne non configuré.' : 'Le paiement en ligne est momentanément indisponible.');
  await LicensePayment.create({ orderId, tenantId, amount, cibOrderId: gw.cibOrderId });
  return { orderId, paymentUrl: gw.paymentUrl, amount };
}

/**
 * Marque la commande payée et émet la licence, une seule fois (transition atomique pending → paid :
 * webhook et vérification au retour peuvent arriver en même temps sans double émission).
 */
export async function fulfillPayment(orderId: string, paidAmount: number | undefined, sofizTxId?: string): Promise<LicenseStatusDTO | null> {
  const order = await LicensePayment.findOne({ orderId });
  if (!order) return null;
  if (paidAmount !== undefined && paidAmount !== order.amount) {
    console.warn('[license] montant incohérent pour', orderId);
    return null;
  }
  const claimed = await LicensePayment.findOneAndUpdate(
    { orderId, status: { $ne: 'paid' } },
    { $set: { status: 'paid', paidAt: new Date(), sofizTxId: sofizTxId ?? '' } },
    { new: true },
  );
  if (claimed) {
    const [issued] = await generateKeys(1, 'lifetime', undefined, `SofizPay ${orderId}`);
    const lic = await redeemKey(issued.key, `tenant:${order.tenantId}`, String(order.tenantId));
    await applyLicenseToTenant(String(order.tenantId), lic);
    await LicensePayment.updateOne({ orderId }, { $set: { licenseKey: lic.key } });
  }
  return getTenantLicenseStatus(String(order.tenantId));
}

/** Confirme une commande auprès de SofizPay (source de vérité) et émet la licence si elle est payée. */
async function confirmWithGateway(order: { orderId: string; cibOrderId?: string | null; tenantId: unknown; status: string }) {
  if (order.status === 'paid') return true;
  if (!order.cibOrderId) return false;
  const check = await checkSofizpayPayment(order.cibOrderId);
  if (!check?.paid) return false;
  return !!(await fulfillPayment(order.orderId, check.amount, order.cibOrderId));
}

/** Retour client : on interroge SofizPay plutôt que de croire l'URL de retour. */
export async function verifyCheckout(tenantId: string, orderId: string) {
  const order = await LicensePayment.findOne({ orderId, tenantId });
  if (!order) fail(404, 'Commande introuvable.');
  const paid = await confirmWithGateway(order);
  return paid ? { paid: true, license: await getTenantLicenseStatus(tenantId) } : { paid: false };
}

/**
 * Callback SofizPay : pas de secret ni de signature chez SofizPay, donc le contenu du callback n'est jamais cru.
 * Il sert uniquement de déclencheur : l'état réel du paiement est relu chez SofizPay.
 */
export async function handleSofizpayCallback(orderId: string) {
  const order = await LicensePayment.findOne({ orderId });
  if (order) await confirmWithGateway(order);
}

/** Liste des commerces pour le super admin : licence en cours et clés qui leur sont rattachées. */
export async function listTenantsOverview(q?: string, limit = 200) {
  const term = q?.trim();
  const query = term ? { $or: ['name', 'slug'].map((f) => ({ [f]: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })) } : {};
  const tenants = await Tenant.find(query).select('name slug status plan license createdAt').sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean();
  const ids = tenants.map((t) => t._id);
  const keys = await License.find({ $or: [{ tenantId: { $in: ids } }, { assignedTenantId: { $in: ids } }] }).select('key kind revoked expiresAt tenantId assignedTenantId').lean();
  return tenants.map((t) => {
    const id = String(t._id);
    return {
      id, name: t.name, slug: t.slug, status: t.status, plan: t.plan, createdAt: t.createdAt,
      license: t.license ? { kind: t.license.kind, expiresAt: t.license.expiresAt } : undefined,
      keys: keys.filter((k) => String(k.tenantId) === id || String(k.assignedTenantId) === id)
        .map((k) => ({ key: k.key, kind: k.kind, revoked: k.revoked, expiresAt: k.expiresAt, used: String(k.tenantId) === id })),
    };
  });
}
