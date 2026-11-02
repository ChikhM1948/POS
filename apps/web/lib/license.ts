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
