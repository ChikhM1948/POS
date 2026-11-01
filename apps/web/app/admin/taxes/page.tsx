'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { StatTile } from '../../../components/admin/reports/StatTile';
import {
  IFU_CEILING_CENTS, IFU_CEILING_WARN_RATIO, IFU_MINIMUM_CENTS, IFU_RATE_GOODS, IFU_RATE_SERVICES,
  estimateIfu, monthRange, yearRange,
} from '../../../lib/taxDeclarations';
import type { StoreDTO, TaxRegime, TaxReturnDTO, TenantSettingsDTO } from '@pos-dz/shared';

const NOW = new Date();

export default function TaxesPage() {
  const { t, locale } = useTranslation();
  const money = (c: number) => formatCurrency(c, locale);
  const { session } = useAdminAuth();
  const [regime, setRegime] = useState<TaxRegime | null>(null);
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [ifuRate, setIfuRate] = useState(IFU_RATE_GOODS);
  const [data, setData] = useState<TaxReturnDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ tenant: TenantSettingsDTO }>(session.token, '/tenant').then(({ tenant }) => setRegime(tenant.taxRegime)).catch((e) => setError(e.message));
    adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores').then(({ stores }) => setStores(stores)).catch(() => undefined);
  }, [session]);

  const load = useCallback(async () => {
    if (!session || !regime) return;
    try {
      const r = regime === 'real' ? monthRange(year, month) : yearRange(year);
      const params = new URLSearchParams(r);
      if (storeId) params.set('storeId', storeId);
      const { taxReturn } = await adminFetch<{ taxReturn: TaxReturnDTO }>(session.token, `/reports/tax-return?${params.toString()}`);
      setData(taxReturn);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    }
  }, [session, regime, year, month, storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const field = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500';
  const years = Array.from({ length: 6 }, (_, i) => NOW.getFullYear() - i);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
          {regime === 'ifu' ? t('taxes.titleG12') : regime === 'real' ? t('taxes.titleG50') : t('taxes.title')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={field}>
            <option value="">{t('sales.allStores')}</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
          {regime === 'real' && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString(locale === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ', { month: 'long' })}</option>
              ))}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => window.print()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            {t('taxes.print')}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {regime && (
        <p className="text-xs text-neutral-500">
          {t('taxes.regimeLabel')} : <strong>{regime === 'ifu' ? t('taxes.regimeIfu') : t('taxes.regimeReal')}</strong> — {regime === 'ifu' ? t('taxes.hintG12') : t('taxes.hintG50')}
        </p>
      )}

      {data && regime === 'real' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t('taxes.turnoverHt')} value={money(data.totalHtCents)} hint={`${data.salesCount} / ${data.refundsCount} ${t('taxes.refundsShort')}`} />
            <StatTile label={t('taxes.tvaCollected')} value={money(data.totalTaxCents)} />
            <StatTile label={t('taxes.turnoverTtc')} value={money(data.totalTtcCents)} />
            <StatTile label={t('taxes.stampDuty')} value={money(data.stampDutyCents)} hint={`${t('taxes.cashPart')} ${money(data.cashCents)}`} />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">{t('taxes.g50Table')}</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-start text-xs font-medium text-neutral-500">
                <tr>
                  <th className="py-1.5 text-start">{t('taxes.rate')}</th>
                  <th className="py-1.5 text-end">{t('taxes.baseHt')}</th>
                  <th className="py-1.5 text-end">{t('taxes.tva')}</th>
                  <th className="py-1.5 text-end">{t('taxes.ttc')}</th>
                </tr>
              </thead>
              <tbody>
                {data.byRate.map((r) => (
                  <tr key={r.taxRate} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1.5 text-neutral-900">{r.taxRate === 0 ? t('taxes.exempt') : `${r.taxRate} %`}</td>
                    <td className="py-1.5 text-end">{money(r.baseHtCents)}</td>
                    <td className="py-1.5 text-end">{money(r.taxCents)}</td>
                    <td className="py-1.5 text-end font-medium text-neutral-900">{money(r.ttcCents)}</td>
                  </tr>
                ))}
                {data.byRate.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-neutral-500">{t('taxes.empty')}</td></tr>}
              </tbody>
              {data.byRate.length > 0 && (
                <tfoot className="border-t border-neutral-300 font-semibold text-neutral-900">
                  <tr>
                    <td className="py-1.5">{t('taxes.total')}</td>
                    <td className="py-1.5 text-end">{money(data.totalHtCents)}</td>
                    <td className="py-1.5 text-end">{money(data.totalTaxCents)}</td>
                    <td className="py-1.5 text-end">{money(data.totalTtcCents)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {data && regime === 'ifu' && (
        <>
          {(() => {
            const turnover = data.totalTtcCents;
            const due = estimateIfu(turnover, ifuRate);
            const ratio = turnover / IFU_CEILING_CENTS;
            return (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label={t('taxes.annualTurnover')} value={money(turnover)} hint={`${data.salesCount} / ${data.refundsCount} ${t('taxes.refundsShort')}`} />
                  <StatTile label={t('taxes.ifuEstimate')} value={money(due)} hint={`${ifuRate} % — ${t('taxes.ifuMin')} ${money(IFU_MINIMUM_CENTS)}`} />
                  <StatTile label={t('taxes.ceiling')} value={`${Math.round(ratio * 100)} %`} hint={money(IFU_CEILING_CENTS)} />
                </div>
                {ratio >= 1 ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{t('taxes.ceilingExceeded')}</p>
                ) : ratio >= IFU_CEILING_WARN_RATIO ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t('taxes.ceilingNear')}</p>
                ) : null}
                <label className="flex w-fit items-center gap-2 text-sm text-neutral-700 print:hidden">
                  {t('taxes.activityType')}
                  <select value={ifuRate} onChange={(e) => setIfuRate(Number(e.target.value))} className={field}>
                    <option value={IFU_RATE_GOODS}>{t('taxes.activityGoods')} ({IFU_RATE_GOODS} %)</option>
                    <option value={IFU_RATE_SERVICES}>{t('taxes.activityServices')} ({IFU_RATE_SERVICES} %)</option>
                  </select>
                </label>
              </>
            );
          })()}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">{t('taxes.monthly')}</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                <tr><th className="py-1.5 text-start">{t('taxes.month')}</th><th className="py-1.5 text-end">{t('taxes.turnover')}</th></tr>
              </thead>
              <tbody>
                {data.byMonth.map((m) => (
                  <tr key={m.month} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1.5 text-neutral-900">{m.month}</td>
                    <td className="py-1.5 text-end font-medium">{money(m.ttcCents)}</td>
                  </tr>
                ))}
                {data.byMonth.length === 0 && <tr><td colSpan={2} className="py-4 text-center text-neutral-500">{t('taxes.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-neutral-500">{t('taxes.disclaimer')}</p>
    </div>
  );
}
