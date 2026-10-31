/**
 * Build « poste local » (application bureau) : l'API et la base SQLite tournent dans le processus
 * Electron sur 127.0.0.1 — aucune connexion Internet n'est jamais requise ni tentée.
 */
export const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === '1';

export interface LocalInfo {
  configured: boolean;
  tenantId?: string;
  storeId?: string;
  businessName?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Commerce enregistré sur ce poste (un seul par installation) — évite toute saisie d'identifiants techniques. */
export async function fetchLocalInfo(): Promise<LocalInfo> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/local-info`);
    if (res.ok) return await res.json();
  } catch {
    /* serveur local indisponible */
  }
  return { configured: false };
}
