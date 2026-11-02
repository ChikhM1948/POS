import { randomBytes, createPrivateKey, sign } from 'node:crypto';
import { License } from '../../models/License';
import { Tenant } from '../../models/Tenant';
import { LicensePayment } from '../../models/LicensePayment';
import { createSofizpayOrder, checkSofizpayPayment } from './sofizpay';
import { env } from '../../config/env';
import { TRIAL_DAYS, LIFETIME_DAYS } from '@pos-dz/shared';
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

/** Signature Ed25519 du contenu de la licence — vérifiée hors-ligne par le poste desktop. */
export function signLicense(l: { key: string; kind: LicenseKind; activatedAt: Date; expiresAt: Date }): SignedLicense {
  if (!env.licensePrivateKey) fail(503, 'Serveur de licences non configuré (LICENSE_PRIVATE_KEY).');
  const payload = { key: l.key, kind: l.kind, activatedAt: l.activatedAt.toISOString(), expiresAt: l.expiresAt.toISOString() };
  const signature = sign(null, Buffer.from(JSON.stringify(payload)), createPrivateKey(env.licensePrivateKey)).toString('base64');
  return { ...payload, signature };
}

/**
 * Consomme une clé. Idempotent pour le même `boundTo` (réactivation après réinstallation / second appel) ;
 * une clé déjà liée à un autre commerce/poste est refusée. L'expiration est fixée au premier usage.
 */
export async function redeemKey(rawKey: string, boundTo: string, tenantId?: string) {
  const key = String(rawKey ?? '').trim().toUpperCase();
  if (!key) fail(400, "Clé d'activation requise.");
  const lic = await License.findOne({ key });
  if (!lic || lic.revoked) fail(404, "Clé d'activation invalide.");
  if (lic.boundTo && lic.boundTo !== boundTo) fail(409, "Cette clé est déjà utilisée par un autre commerce ou poste.");

  if (!lic.redeemedAt) {
    const now = new Date();
    lic.redeemedAt = now;
    lic.expiresAt = new Date(now.getTime() + lic.durationDays * DAY_MS);
    lic.boundTo = boundTo;
  }
  if (tenantId) lic.tenantId = tenantId as any;
  await lic.save();
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

export async function markPaymentFailed(orderId: string) {
  await LicensePayment.updateOne({ orderId, status: 'pending' }, { $set: { status: 'failed' } });
}

/** Retour client : on interroge SofizPay (la source de vérité) plutôt que de croire l'URL de retour. */
export async function verifyCheckout(tenantId: string, orderId: string) {
  const order = await LicensePayment.findOne({ orderId, tenantId });
  if (!order) fail(404, 'Commande introuvable.');
  if (order.status === 'paid') return { paid: true, license: await getTenantLicenseStatus(tenantId) };
  if (!order.cibOrderId) return { paid: false };
  const check = await checkSofizpayPayment(order.cibOrderId);
  if (!check?.paid) return { paid: false };
  const license = await fulfillPayment(orderId, check.amount, order.cibOrderId);
  return { paid: !!license, license: license ?? undefined };
}
