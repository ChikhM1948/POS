/** Jours entiers entre aujourd'hui (date locale) et une date de péremption (négatif = périmé). */
export function daysUntilExpiry(expiryIso: string, now = new Date()): number {
  const e = new Date(expiryIso);
  const expiry = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry - today) / 86_400_000);
}

/** Seuil (jours) en dessous duquel un lot est signalé « bientôt périmé » — aligné sur le défaut du serveur. */
export const EXPIRY_WARNING_DAYS = 30;
