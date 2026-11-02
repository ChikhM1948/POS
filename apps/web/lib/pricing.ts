import type { LocalProduct } from './db/offline-db';

type PromoFields = Pick<LocalProduct, 'sellingPriceCents' | 'promoPriceCents' | 'promoStart' | 'promoEnd'>;

/** Vrai si une promotion valide (prix inférieur, fenêtre de dates ouverte) s'applique à `now`. */
export function isPromoActive(p: PromoFields, now: Date = new Date()): boolean {
  if (p.promoPriceCents == null || p.promoPriceCents >= p.sellingPriceCents) return false;
  if (p.promoStart && new Date(p.promoStart) > now) return false;
  if (p.promoEnd && new Date(p.promoEnd) < now) return false;
  return true;
}

/** Prix unitaire à encaisser : prix promo si actif, sinon prix normal (prix au kg pour un produit au poids). */
export function effectivePriceCents(p: PromoFields, now: Date = new Date()): number {
  return isPromoActive(p, now) ? (p.promoPriceCents as number) : p.sellingPriceCents;
}

/** Total d'une ligne ; quantité éventuellement fractionnaire (kg) → arrondi au centime. */
export function lineTotalCents(unitPriceCents: number, quantity: number, discountCents: number): number {
  return Math.round(unitPriceCents * quantity) - discountCents;
}

export const roundQty = (q: number) => Math.round(q * 1000) / 1000;

/**
 * Code-barres balance EAN-13 à poids imprimé : « 2 » + 6 chiffres d'article + 5 chiffres de poids
 * en grammes + clé. Le produit est retrouvé via les 7 premiers chiffres (« 2XXXXXX »), à saisir
 * comme code-barres du produit. Retourne null si `code` n'a pas ce format ou si aucun produit ne correspond.
 */
export function parseScaleBarcode(code: string, products: LocalProduct[]): { product: LocalProduct; quantity: number } | null {
  if (!/^2\d{12}$/.test(code)) return null;
  const prefix = code.slice(0, 7);
  const grams = parseInt(code.slice(7, 12), 10);
  const product = products.find((p) => p.soldByWeight && p.barcode === prefix);
  if (!product || !(grams > 0)) return null;
  return { product, quantity: roundQty(grams / 1000) };
}
