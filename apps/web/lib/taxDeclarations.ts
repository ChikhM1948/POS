/**
 * Paramètres fiscaux algériens utilisés par les écrans G50 / G12.
 * ⚠ Valeurs indicatives (loi de finances en vigueur à la rédaction) — elles changent d'une LF à l'autre.
 * Les centraliser ici évite de les disséminer dans l'UI ; à vérifier avec l'inspection des impôts / le comptable.
 */
export const IFU_RATE_GOODS = 5; // % — production et vente de biens
export const IFU_RATE_SERVICES = 12; // % — autres activités (prestations)
export const IFU_MINIMUM_CENTS = 10_000 * 100; // cotisation minimale
export const IFU_CEILING_CENTS = 15_000_000 * 100; // seuil de chiffre d'affaires du régime IFU
export const IFU_CEILING_WARN_RATIO = 0.8;

/** Bornes ISO d'une période à l'heure d'Alger (UTC+1 toute l'année), pour ne pas perdre les ventes de la 1re/dernière heure. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${mm}-01T00:00:00+01:00`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999+01:00` };
}

export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01T00:00:00+01:00`, to: `${year}-12-31T23:59:59.999+01:00` };
}

/** IFU estimé = taux × CA, plancher à la cotisation minimale (0 si aucun CA). */
export function estimateIfu(turnoverCents: number, ratePercent: number): number {
  if (turnoverCents <= 0) return 0;
  return Math.max(IFU_MINIMUM_CENTS, Math.round((turnoverCents * ratePercent) / 100));
}
