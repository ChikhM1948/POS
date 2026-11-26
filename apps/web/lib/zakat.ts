import type { StockBalanceDTO } from '@pos-dz/shared';
import { DEFAULT_ZAKAT_RATE_PERCENT, isValidZakatRate } from '@pos-dz/shared';
import { stockValueCents } from './stock';

/** Valeur de vente du stock disponible ; les ruptures ne diminuent pas l'assiette. */
export function calculateStockZakat(balances: StockBalanceDTO[], ratePercent = DEFAULT_ZAKAT_RATE_PERCENT) {
  if (!isValidZakatRate(ratePercent)) throw new RangeError('Invalid Zakat rate');
  const stockValue = balances.reduce(
    (total, balance) => total + (balance.quantity > 0 ? stockValueCents(balance) : 0),
    0,
  );
  return {
    stockValueCents: stockValue,
    // Arrondi une seule fois sur l'assiette totale, au taux choisi par le commerce.
    zakatCents: Math.round(stockValue * ratePercent / 100),
  };
}
