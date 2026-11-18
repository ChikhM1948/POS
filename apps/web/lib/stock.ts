import type { StockBalanceDTO } from '@pos-dz/shared';

const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function filterStockBalances(balances: StockBalanceDTO[], search: string, lowOnly: boolean): StockBalanceDTO[] {
  const query = normalize(search);
  return balances.filter((balance) => {
    const matchesSearch = [balance.name.fr, balance.name.ar, balance.sku, balance.barcode]
      .some((value) => value !== undefined && normalize(value).includes(query));
    const matchesThreshold = !lowOnly || (
      balance.lowStockThreshold !== undefined && balance.lowStockThreshold > 0 && balance.quantity <= balance.lowStockThreshold
    );
    return matchesSearch && matchesThreshold;
  });
}

/** Arrondi au centime par ligne, y compris pour les produits vendus au poids. */
export function stockValueCents(balance: StockBalanceDTO): number {
  return Math.round(balance.quantity * balance.sellingPriceCents);
}
