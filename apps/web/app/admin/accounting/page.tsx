'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency, formatDate } from '../../../lib/format';
import { monthRange, yearRange } from '../../../lib/taxDeclarations';
import { StatTile } from '../../../components/admin/reports/StatTile';
import {
  CSV_MIME, XLSX_MIME, buildVatSummary, downloadFile, journalSheet, toCsv, toXlsx, vatSheet,
  type ExportLabels,
} from '../../../lib/accountingExport';
import type { JournalEntryDTO, StoreDTO } from '@pos-dz/shared';

type Period = 'month' | 'quarter' | 'year';
const NOW = new Date();
const JOURNAL_PREVIEW_ROWS = 200;
const METHODS = ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'] as const;

export default function AccountingPage() {
  const { t, locale } = useTranslation();
  const money = (c: number) => formatCurrency(c, locale);
  const { session } = useAdminAuth();
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [storeId, setStoreId] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(NOW.getMonth() / 3) + 1);
  const [entries, setEntries] = useState<JournalEntryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ stores: StoreDTO[] }>(session.token, '/stores').then(({ stores }) => setStores(stores)).catch(() => undefined);
  }, [session]);

  const range = useMemo(() => {
    if (period === 'year') return yearRange(year);
    if (period === 'quarter') return { from: monthRange(year, quarter * 3 - 2).from, to: monthRange(year, quarter * 3).to };
    return monthRange(year, month);
  }, [period, year, month, quarter]);

  const load = useCallback(async () => {
    if (!session) return;
    setEntries(null);
    try {
      const params = new URLSearchParams(range);
      if (storeId) params.set('storeId', storeId);
      const res = await adminFetch<{ entries: JournalEntryDTO[] }>(session.token, `/reports/accounting-journal?${params}`);
      setEntries(res.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    }
  }, [session, range, storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => buildVatSummary(entries ?? []), [entries]);

  const labels: ExportLabels = {
    journal: t('accounting.journal'), vatByRate: t('accounting.vatByRate'), vatByMonth: t('accounting.vatByMonth'),
    date: t('accounting.colDate'), type: t('accounting.colType'), number: t('accounting.colNumber'), invoiceNumber: t('accounting.colInvoice'),
    customer: t('accounting.colClient'), customerNif: t('accounting.colNif'), baseHt: t('accounting.colBase'), vat: t('accounting.colVat'),
    totalHt: t('accounting.colTotalHt'), totalVat: t('accounting.colTotalVat'), totalTtc: t('accounting.colTotalTtc'),
    stampDuty: t('accounting.colStamp'), payment: t('accounting.colPayment'), rate: t('accounting.colRate'), month: t('accounting.colMonth'), total: t('accounting.total'),
    kinds: { sale: t('accounting.kindSale'), refund: t('accounting.kindRefund'), invoice: t('accounting.kindInvoice') },
    methods: Object.fromEntries(METHODS.map((m) => [m, t(`common.paymentMethods.${m}`)])),
  };

  const stamp = period === 'year' ? String(year) : period === 'quarter' ? `${year}-T${quarter}` : `${year}-${String(month).padStart(2, '0')}`;
  const journal = entries ? journalSheet(entries, labels) : null;
  const vat = vatSheet(summary, labels);
  const hasData = (entries?.length ?? 0) > 0;

  const exportCsv = (which: 'journal' | 'vat') =>
    downloadFile(toCsv((which === 'journal' ? journal! : vat).rows), `${t(which === 'journal' ? 'accounting.journalFile' : 'accounting.vatFile')}-${stamp}.csv`, CSV_MIME);
  const exportXlsx = () =>
    downloadFile(toXlsx([vat, journal!]) as BlobPart, `${t('accounting.workbookFile')}-${stamp}.xlsx`, XLSX_MIME);

  const field = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500';
  const btn = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40';
  const years = Array.from({ length: 6 }, (_, i) => NOW.getFullYear() - i);
  const kindLabel = (k: JournalEntryDTO['kind']) => t(`accounting.kind${k === 'sale' ? 'Sale' : k === 'refund' ? 'Refund' : 'Invoice'}`);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('accounting.title')}</h1>
          <p className="text-sm text-neutral-500">{t('accounting.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={field}>
            <option value="">{t('accounting.allStores')}</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={field}>
            <option value="month">{t('accounting.periodMonth')}</option>
            <option value="quarter">{t('accounting.periodQuarter')}</option>
            <option value="year">{t('accounting.periodYear')}</option>
          </select>
          {period === 'month' && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString(locale === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ', { month: 'long' })}</option>
              ))}
            </select>
          )}
          {period === 'quarter' && (
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{t('accounting.quarter', { n: q })}</option>)}
            </select>
          )}
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm text-neutral-500">{t('accounting.exportAll')}</span>
        <button disabled={!hasData} onClick={() => exportCsv('journal')} className={btn}>{t('accounting.journal')} · {t('accounting.exportCsv')}</button>
        <button disabled={!hasData} onClick={() => exportCsv('vat')} className={btn}>{t('accounting.vatByRate')} · {t('accounting.exportCsv')}</button>
        <button disabled={!hasData} onClick={exportXlsx} className={btn}>{t('accounting.exportXlsx')}</button>
        <button disabled={!hasData} onClick={() => window.print()} className={btn}>{t('accounting.print')}</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="hidden text-sm font-medium print:block">{t('accounting.title')} — {stamp}</p>

      {entries && !hasData && <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{t('accounting.noData')}</p>}

      {hasData && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t('accounting.totalHt')} value={money(summary.totalHtCents)} hint={`${summary.salesCount} ${t('accounting.salesCount').toLowerCase()} · ${summary.refundsCount} ${t('accounting.refundsCount').toLowerCase()} · ${summary.invoicesCount} ${t('accounting.invoicesCount').toLowerCase()}`} />
            <StatTile label={t('accounting.totalVat')} value={money(summary.totalTaxCents)} />
            <StatTile label={t('accounting.totalTtc')} value={money(summary.totalTtcCents)} />
            <StatTile label={t('accounting.stampDuty')} value={money(summary.stampDutyCents)} />
          </div>

          <section className="rounded-xl bg-white shadow-card p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">{t('accounting.vatByRate')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-1 text-start font-medium">{t('accounting.colRate')}</th>
                  <th className="py-1 text-end font-medium">{t('accounting.colBase')}</th>
                  <th className="py-1 text-end font-medium">{t('accounting.colVat')}</th>
                  <th className="py-1 text-end font-medium">{t('accounting.colTotalTtc')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.byRate.map((r) => (
                  <tr key={r.taxRate} className="border-b border-neutral-100">
                    <td className="py-1">{r.taxRate}%</td>
                    <td className="py-1 text-end tabular-nums">{money(r.baseHtCents)}</td>
                    <td className="py-1 text-end tabular-nums">{money(r.taxCents)}</td>
                    <td className="py-1 text-end tabular-nums">{money(r.ttcCents)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1">{t('accounting.total')}</td>
                  <td className="py-1 text-end tabular-nums">{money(summary.totalHtCents)}</td>
                  <td className="py-1 text-end tabular-nums">{money(summary.totalTaxCents)}</td>
                  <td className="py-1 text-end tabular-nums">{money(summary.totalTtcCents)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {summary.byMonth.length > 1 && (
            <section className="rounded-xl bg-white shadow-card p-4">
              <h2 className="mb-2 text-sm font-semibold text-neutral-800">{t('accounting.vatByMonth')}</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="py-1 text-start font-medium">{t('accounting.colMonth')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalHt')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalVat')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalTtc')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byMonth.map((m) => (
                    <tr key={m.month} className="border-b border-neutral-100">
                      <td className="py-1">{m.month}</td>
                      <td className="py-1 text-end tabular-nums">{money(m.totalHtCents)}</td>
                      <td className="py-1 text-end tabular-nums">{money(m.totalTaxCents)}</td>
                      <td className="py-1 text-end tabular-nums">{money(m.totalTtcCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="rounded-xl bg-white shadow-card p-4 print:hidden">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">
              {t('accounting.journal')} <span className="font-normal text-neutral-500">· {t('accounting.journalHint', { count: entries!.length })}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="py-1 text-start font-medium">{t('accounting.colDate')}</th>
                    <th className="py-1 text-start font-medium">{t('accounting.colType')}</th>
                    <th className="py-1 text-start font-medium">{t('accounting.colNumber')}</th>
                    <th className="py-1 text-start font-medium">{t('accounting.colInvoice')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalHt')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalVat')}</th>
                    <th className="py-1 text-end font-medium">{t('accounting.colTotalTtc')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries!.slice(0, JOURNAL_PREVIEW_ROWS).map((e) => (
                    <tr key={`${e.kind}-${e.number}`} className="border-b border-neutral-100">
                      <td className="py-1">{formatDate(e.date, locale)}</td>
                      <td className="py-1">{kindLabel(e.kind)}</td>
                      <td className="py-1 font-mono text-xs">{e.number}</td>
                      <td className="py-1 font-mono text-xs">{e.documentNumber ?? ''}</td>
                      <td className="py-1 text-end tabular-nums">{money(e.totalHtCents)}</td>
                      <td className="py-1 text-end tabular-nums">{money(e.totalTaxCents)}</td>
                      <td className="py-1 text-end tabular-nums">{money(e.totalTtcCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries!.length > JOURNAL_PREVIEW_ROWS && <p className="mt-2 text-xs text-neutral-500">{JOURNAL_PREVIEW_ROWS} / {entries!.length} — {t('accounting.exportXlsx')}</p>}
          </section>

          <p className="text-xs text-neutral-500">{t('accounting.sourceNote')}</p>
          <p className="text-xs font-medium text-amber-700">{t('accounting.disclaimer')}</p>
        </>
      )}
    </div>
  );
}
