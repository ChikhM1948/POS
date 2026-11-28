import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { StockBalanceDTO } from '@pos-dz/shared';
import { calculateStockZakat } from './zakat';
import { isValidZakatRate } from '@pos-dz/shared';

const product: StockBalanceDTO = {
  productId: '1', sku: 'CAFE', name: { fr: 'Café' }, unit: 'kg',
  isPerishable: false, quantity: 10, sellingPriceCents: 20000,
};

test('zakat : applique le taux personnalisé, y compris zéro', () => {
  assert.equal(calculateStockZakat([product], 3).zakatCents, 6000);
  assert.equal(calculateStockZakat([product], 2.577).zakatCents, 5154);
  assert.equal(calculateStockZakat([product], 0).zakatCents, 0);
  assert.equal(calculateStockZakat([product], 100).zakatCents, 200000);
});

test('zakat : rejette les taux invalides côté saisie et calcul', () => {
  for (const value of [-1, 101, NaN, Infinity, -Infinity, null, '', '2.5', {}, true]) {
    assert.equal(isValidZakatRate(value), false);
  }
  for (const rate of [-1, 101, NaN, Infinity]) {
    assert.throws(() => calculateStockZakat([product], rate), RangeError);
  }
});

test('zakat : valorise la quantité au prix de vente, indépendamment du prix d’achat', () => {
  const balance = { ...product, costPriceCents: 5000 };
  assert.deepEqual(calculateStockZakat([balance]), { stockValueCents: 200000, zakatCents: 5000 });
});

test('zakat : additionne les stocks des boutiques et arrondit le taux sur le total', () => {
  assert.deepEqual(calculateStockZakat([
    { ...product, quantity: 1.25, sellingPriceCents: 12345 },
    { ...product, quantity: 0.5, sellingPriceCents: 12345 },
  ]), { stockValueCents: 21604, zakatCents: 540 });
  assert.deepEqual(calculateStockZakat([
    { ...product, quantity: 1, sellingPriceCents: 19 },
    { ...product, quantity: 1, sellingPriceCents: 19 },
  ]), { stockValueCents: 38, zakatCents: 1 });
});

test('zakat : les quantités nulles et négatives ne réduisent pas le stock disponible', () => {
  assert.deepEqual(calculateStockZakat([
    product, { ...product, quantity: -20 }, { ...product, quantity: 0 },
    { ...product, sellingPriceCents: 0 },
  ]), { stockValueCents: 200000, zakatCents: 5000 });
  assert.deepEqual(calculateStockZakat([]), { stockValueCents: 0, zakatCents: 0 });
});
