'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { SupplierPriceHistoryDTO } from '@pos-dz/shared';

interface Props {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

/** Évolution du prix d'achat unitaire par produit chez un fournisseur — les hausses ≥ seuil sont surlignées. */
export function SupplierPriceHistoryPanel({ supplierId, supplierName, onClose }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [data, setData] = useState<SupplierPriceHistoryDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<SupplierPriceHistoryDTO>(session.token, `/suppliers/${supplierId}/price-history`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : t('common.errorLoading')));
  }, [session, supplierId]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">{t('priceHistory.title', { name: supplierName })}</h3>
        <button onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">{t('common.close')}</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && data.alertCount > 0 && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{t('priceHistory.alertBanner', { count: data.alertCount })}</p>
      )}
      {data && data.products.length === 0 && <p className="text-sm text-neutral-500">{t('priceHistory.empty')}</p>}
      {data && data.products.length > 0 && (
        <>
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-start text-xs font-medium text-neutral-500">
              <tr>
                <th className="py-1.5">{t('priceHistory.colProduct')}</th>
                <th className="py-1.5">{t('priceHistory.colPrevious')}</th>
                <th className="py-1.5">{t('priceHistory.colLatest')}</th>
                <th className="py-1.5">{t('priceHistory.colChange')}</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <>
                  <tr key={p.productId} className="border-b border-neutral-100">
                    <td className="py-1.5 font-medium text-neutral-900">{p.productName}</td>
                    <td className="py-1.5 text-neutral-600">{p.previousCents !== undefined ? formatDZD(p.previousCents) : t('common.dash')}</td>
                    <td className="py-1.5 text-neutral-900">{formatDZD(p.latestCents)}</td>
                    <td className={`py-1.5 font-medium ${p.alert ? 'text-red-600' : (p.changePct ?? 0) < 0 ? 'text-emerald-600' : 'text-neutral-500'}`}>
                      {p.changePct === undefined ? t('common.dash') : `${p.changePct > 0 ? '+' : ''}${p.changePct} %`}
                    </td>
                    <td className="py-1.5 text-end">
                      <button onClick={() => setOpenId(openId === p.productId ? null : p.productId)} className="text-xs font-medium text-brand-700 hover:underline">
                        {t('priceHistory.colHistory')}
                      </button>
                    </td>
                  </tr>
                  {openId === p.productId && (
                    <tr key={`${p.productId}-h`}>
                      <td colSpan={5} className="bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                        {[...p.points].reverse().map((pt, i) => (
                          <p key={i}>{formatDateTime(pt.date, locale)} — {formatDZD(pt.unitCostCents)} × {pt.quantity}</p>
                        ))}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-500">{t('priceHistory.thresholdHint')}</p>
        </>
      )}
    </div>
  );
}
