import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { StockBalanceDTO } from '@pos-dz/shared';
import { filterStockBalances, stockValueCents } from './stock';

const balances: StockBalanceDTO[] = [
  { productId: '1', sku: 'CAFE-01', barcode: '001234567890', name: { fr: 'Café', ar: 'قهوة' }, unit: 'kg', isPerishable: false, quantity: 1.25, lowStockThreshold: 2, sellingPriceCents: 12345 },
  { productId: '2', sku: 'LAIT-01', name: { fr: 'Lait' }, unit: 'litre', isPerishable: true, quantity: 3, lowStockThreshold: 1, sellingPriceCents: 10000 },
];

test('recherche par nom français/arabe, référence et code-barres, sans casse ni accents', () => {
  for (const query of [' CAFÉ ', 'cafe', 'قهوة', 'cafe-01', '001234567890']) {
    assert.deepEqual(filterStockBalances(balances, query, false), [balances[0]]);
  }
  assert.deepEqual(filterStockBalances(balances, '   ', false), balances);
  assert.deepEqual(filterStockBalances(balances, 'absent', false), []);
});

test('la recherche se combine au filtre de stock faible', () => {
  assert.deepEqual(filterStockBalances(balances, '', true), [balances[0]]);
  assert.deepEqual(filterStockBalances(balances, 'lait', true), []);
  assert.deepEqual(filterStockBalances([{ ...balances[0], quantity: 2 }], '', true).length, 1);
});

test('valorisation des quantités fractionnaires, nulles et négatives au centime', () => {
  assert.equal(stockValueCents(balances[0]), 15431);
  assert.equal(stockValueCents({ ...balances[0], quantity: 0 }), 0);
  assert.equal(stockValueCents({ ...balances[0], quantity: -2 }), -24690);
  assert.equal(stockValueCents({ ...balances[0], sellingPriceCents: 0 }), 0);
  const total = (search: string, lowOnly = false) => filterStockBalances(balances, search, lowOnly)
    .reduce((sum, balance) => sum + stockValueCents(balance), 0);
  assert.equal(total(''), 45431);
  assert.equal(total('cafe'), 15431);
  assert.equal(total('', true), 15431);
  assert.equal(total('absent'), 0);
});
