import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tenant } from '../../models/Tenant';
import { getTenantSettings, updateTenantSettings } from './tenant.service';

test('paramètres Zakat : défaut pour les anciens commerces, taux enregistré et mises à jour partielles', async (t) => {
  const stored = { name: 'Commerce', slug: 'commerce', legal: {} as { zakatRatePercent?: number } };
  t.mock.method(Tenant, 'findById', () => ({ lean: async () => structuredClone(stored) }));
  const updates: Record<string, unknown>[] = [];
  t.mock.method(Tenant, 'findByIdAndUpdate', (_id: string, update: { $set: Record<string, unknown> }) => {
    updates.push(update.$set);
    if ('legal.zakatRatePercent' in update.$set) stored.legal.zakatRatePercent = update.$set['legal.zakatRatePercent'] as number;
    return { lean: async () => structuredClone(stored) };
  });

  assert.equal((await getTenantSettings('tenant'))?.zakatRatePercent, 2.5);
  for (const rate of [3.25, 0, 100]) {
    assert.equal((await updateTenantSettings('tenant', { zakatRatePercent: rate }))?.zakatRatePercent, rate);
    assert.equal((await getTenantSettings('tenant'))?.zakatRatePercent, rate);
  }
  await updateTenantSettings('tenant', { phone: '0555000000' });
  assert.equal((await getTenantSettings('tenant'))?.zakatRatePercent, 100);
  assert.equal('legal.zakatRatePercent' in updates.at(-1)!, false);
});

test('paramètres Zakat : taux invalides refusés avant toute écriture', async (t) => {
  const write = t.mock.method(Tenant, 'findByIdAndUpdate', () => { throw new Error('Unexpected write'); });
  for (const rate of [-1, 101, NaN, Infinity, null, '2.5', true]) {
    await assert.rejects(updateTenantSettings('tenant', { zakatRatePercent: rate as number }), { status: 400 });
  }
  assert.equal(write.mock.callCount(), 0);
});
