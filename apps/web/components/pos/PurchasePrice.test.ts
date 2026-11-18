import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PurchasePrice } from './PurchasePrice';

test('affiche le prix d’achat seulement avec une autorisation explicite', () => {
  const render = (allowed?: boolean, cents?: number, locale: 'fr' | 'ar' = 'fr') => renderToStaticMarkup(
    React.createElement(PurchasePrice, { allowed, cents, locale }),
  );
  assert.match(render(true, 12500), /Prix d&#x27;achat.*125,00/);
  assert.match(render(true, 0), /0,00/);
  assert.match(render(true, 12500, 'ar'), /سعر الشراء/);
  assert.equal(render(false, 12500), '');
  assert.equal(render(undefined, 12500), '');
  assert.equal(render(true, undefined), '');
});
