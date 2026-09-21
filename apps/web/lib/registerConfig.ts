export interface RegisterConfig {
  tenantId: string;
  storeId: string;
}

const STORAGE_KEY = 'pos-register-config';

/** Config du poste de caisse (tenant + boutique) — propre à l'appareil, distincte de la session caissier (PIN, voir LoginForm). */
export function loadRegisterConfig(): RegisterConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegisterConfig) : null;
  } catch {
    return null;
  }
}

export function saveRegisterConfig(config: RegisterConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // stockage indisponible (navigation privée) — la config sera redemandée à chaque ouverture
  }
}

export function clearRegisterConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* voir ci-dessus */
  }
}
