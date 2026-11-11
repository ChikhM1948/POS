import type { LicenseStatusDTO } from '@pos-dz/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Émis par adminFetch quand l'API répond 402 LICENSE_EXPIRED : LicenseGate affiche alors l'écran de saisie de clé. */
export const LICENSE_EXPIRED_EVENT = 'pos:license-expired';

export async function fetchLicenseStatus(token: string): Promise<LicenseStatusDTO | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/license/status`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()).license as LicenseStatusDTO;
  } catch {
    return null; // hors-ligne : on ne bloque jamais sur une erreur réseau
  }
}

export async function activateLicense(token: string | undefined, key: string): Promise<LicenseStatusDTO> {
  const res = await fetch(`${API_BASE_URL}/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ key }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body.license as LicenseStatusDTO;
}

export interface LicensePrice { lifetime: { amount: number; currency: string }; onlinePayment: boolean }

export async function fetchLicensePrice(): Promise<LicensePrice | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/license/price`);
    return res.ok ? ((await res.json()) as LicensePrice) : null;
  } catch {
    return null;
  }
}

/** Crée la commande SofizPay et renvoie l'URL de paiement hébergée (CIB / Dahabia). */
export async function startLicenseCheckout(token: string, customer: { name?: string; email?: string; phone?: string } = {}): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/license/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(customer),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.paymentUrl) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body.paymentUrl as string;
}

/** Au retour de SofizPay : confirme le paiement côté serveur et renvoie le statut de licence mis à jour. */
export async function verifyLicenseCheckout(token: string, orderId: string): Promise<{ paid: boolean; license?: LicenseStatusDTO }> {
  const res = await fetch(`${API_BASE_URL}/license/checkout/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { paid: false };
  return res.json();
}

/** Poste local : renouvelle le bail de la licence auprès du serveur (Internet requis). */
export async function renewLicense(token: string | undefined): Promise<LicenseStatusDTO> {
  const res = await fetch(`${API_BASE_URL}/license/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erreur ${res.status}`);
  return body.license as LicenseStatusDTO;
}

/** Poste local : identifiant du poste, à communiquer à l'éditeur pour obtenir un code d'activation hors-ligne. */
export async function fetchDeviceId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/license/device`);
    return res.ok ? ((await res.json()).deviceId as string) : null;
  } catch {
    return null;
  }
}
