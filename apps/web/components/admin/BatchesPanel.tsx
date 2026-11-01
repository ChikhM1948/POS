'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import type { StockBatchDTO } from '@pos-dz/shared';

/** Lots en stock triés par péremption (le plus urgent en premier) — la caisse vend dans cet ordre (FEFO). */
export function BatchesPanel({ storeId }: { storeId: string }) {
  const { t, locale } = useTranslation();
  const { session } = useAdminAuth();
  const [batches, setBatches] = useState<StockBatchDTO[]>([]);
  const [warningDays, setWarningDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !storeId) return;
    adminFetch<{ batches: StockBatchDTO[]; expiryWarningDays: number }>(session.token, `/stock/batches?storeId=${storeId}`)
      .then((r) => {
        setBatches(r.batches);
        setWarningDays(r.expiryWarningDays);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.errorLoading')));
  }, [session, storeId, t]);

  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">{t('inventory.batchesIntro')}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-3">{t('products.tableProduct')}</th>
              <th className="px-4 py-3">{t('inventory.tableLot')}</th>
              <th className="px-4 py-3">{t('inventory.tableExpiry')}</th>
              <th className="px-4 py-3">{t('inventory.tableQuantity')}</th>
              <th className="px-4 py-3">{t('inventory.tableStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, i) => {
              const expired = b.daysLeft !== undefined && b.daysLeft < 0;
              const soon = b.daysLeft !== undefined && b.daysLeft >= 0 && b.daysLeft <= warningDays;
              return (
                <tr key={`${b.productId}-${b.lotNumber ?? ''}-${b.expiryDate ?? ''}-${i}`} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-neutral-900">{b.name.fr}</p>
                    <p className="font-mono text-xs text-neutral-500">{b.sku}</p>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-700">{b.lotNumber ?? <span className="text-neutral-400">{t('inventory.noLot')}</span>}</td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {b.expiryDate ? dateFmt.format(new Date(b.expiryDate)) : <span className="text-neutral-400">{t('inventory.noExpiry')}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-neutral-900">
                    {b.quantity} {b.unit}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        expired ? 'bg-red-100 text-red-700' : soon ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {expired ? t('inventory.statusExpired') : soon ? t('inventory.statusSoon') : t('inventory.statusOk')}
                      {b.daysLeft !== undefined && ` (${b.daysLeft} j)`}
                    </span>
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  {t('inventory.noBatches')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
