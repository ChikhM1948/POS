'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { DOC_PREFIX, buildDocTotals, type FiscalDocKind } from '../../lib/documents';
import type { SaleDetailDTO, TenantSettingsDTO } from '@pos-dz/shared';

interface Props {
  sale: SaleDetailDTO;
  tenant: TenantSettingsDTO;
  kind: FiscalDocKind;
  onClose: () => void;
}

/** Facture / bon de livraison / proforma A4 générés depuis une vente — imprimables via window.print() (voir .doc-print dans globals.css). */
export function SalesDocument({ sale, tenant, kind, onClose }: Props) {
  const { t, locale, dir } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const [client, setClient] = useState({ name: '', address: '', nif: '', rc: '', nis: '', ai: '' });
  const totals = useMemo(() => buildDocTotals(sale, kind, locale), [sale, kind, locale]);
  const showPrices = kind !== 'deliveryNote';
  const legal = tenant.legal ?? {};
  const legalIncomplete = !legal.nif || !legal.nis || !legal.rc || !legal.ai || !legal.address;
  const docNumber = `${DOC_PREFIX[kind]}-${sale.number}`;
  const title = t(`docs.${kind}`);
  const paymentLabel = sale.payments.map((p) => `${t(`common.paymentMethods.${p.method}`)} (${formatDZD(p.amountCents)})`).join(', ');
  const idLine = (pairs: [string, string | undefined][]) =>
    pairs.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

  return (
    <div className="doc-overlay fixed inset-0 z-50 overflow-auto bg-neutral-200 p-4 print:p-0" dir={dir}>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 rounded-xl border border-neutral-300 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-neutral-900">{title} · {docNumber}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">{t('docs.back')}</button>
            <button onClick={() => window.print()} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">{t('docs.print')}</button>
          </div>
        </div>
        {sale.type === 'refund' && <p className="text-sm text-amber-700">{t('docs.refundNotice')}</p>}
        {legalIncomplete && <p className="text-sm text-amber-700">{t('docs.missingLegal')}</p>}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-neutral-700">{t('docs.clientInfo')}</summary>
          <p className="mt-1 text-xs text-neutral-500">{t('docs.clientNote')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['name', 'docs.clientName'], ['address', 'docs.clientAddress'], ['nif', 'docs.nif'], ['rc', 'docs.rc'], ['nis', 'docs.nis'], ['ai', 'docs.ai']] as const).map(([k, label]) => (
              <label key={k} className="flex flex-col gap-0.5 text-xs font-medium text-neutral-600">
                {t(label)}
                <input value={client[k]} onChange={(e) => setClient({ ...client, [k]: e.target.value })} className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-900 focus:border-brand-500" />
              </label>
            ))}
          </div>
        </details>
      </div>

      <article className="doc-print mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-[12mm] text-[11pt] leading-snug text-black shadow">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {tenant.branding.logoUrl && <img src={tenant.branding.logoUrl} alt="" className="h-16 w-16 object-contain" />}
            <div>
              <p className="text-lg font-bold">{tenant.name}</p>
              {legal.address && <p>{legal.address}</p>}
              {tenant.phone && <p>{t('docs.phone')} : {tenant.phone}</p>}
              <p className="text-[9.5pt]">{idLine([['NIF', legal.nif], ['NIS', legal.nis]])}</p>
              <p className="text-[9.5pt]">{idLine([['RC', legal.rc], ['AI', legal.ai]])}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold uppercase">{title}</p>
            <p>{t('docs.number')} {docNumber}</p>
            <p>{t('docs.date')} : {formatDateTime(sale.createdAtLocal, locale)}</p>
          </div>
        </header>

        <section className="my-4 ms-auto w-1/2 rounded border border-black p-2 text-[10pt]">
          <p className="font-semibold">{client.name || '—'}</p>
          {client.address && <p>{client.address}</p>}
          <p>{idLine([['NIF', client.nif], ['RC', client.rc], ['NIS', client.nis], ['AI', client.ai]])}</p>
        </section>

        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr className="border-y-2 border-black">
              <th className="py-1 text-start">{t('docs.designation')}</th>
              <th className="py-1 text-end">{t('docs.qty')}</th>
              {showPrices && <th className="py-1 text-end">{t('docs.unitHt')}</th>}
              {showPrices && <th className="py-1 text-end">{t('docs.vat')}</th>}
              {showPrices && <th className="py-1 text-end">{t('docs.totalHt')}</th>}
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-400">
                <td className="py-1">{l.name}</td>
                <td className="py-1 text-end">{l.quantity}</td>
                {showPrices && <td className="py-1 text-end">{formatDZD(l.unitHtCents)}</td>}
                {showPrices && <td className="py-1 text-end">{l.taxRate}%</td>}
                {showPrices && <td className="py-1 text-end">{formatDZD(l.totalHtCents)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {showPrices && (
          <div className="mt-4 flex items-start justify-between gap-6 text-[10pt]">
            <table className="border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="pe-4 text-start">{t('docs.vat')}</th>
                  <th className="pe-4 text-end">{t('docs.base')}</th>
                  <th className="text-end">{t('docs.vatAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {totals.vatByRate.map((v) => (
                  <tr key={v.rate}>
                    <td className="pe-4">{v.rate}%</td>
                    <td className="pe-4 text-end">{formatDZD(v.baseCents)}</td>
                    <td className="text-end">{formatDZD(v.vatCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-64 border-collapse">
              <tbody>
                <tr><td>{t('docs.totalHt')}</td><td className="text-end">{formatDZD(totals.totalHtCents)}</td></tr>
                <tr><td>{t('docs.totalVat')}</td><td className="text-end">{formatDZD(totals.totalVatCents)}</td></tr>
                <tr className="border-t border-black font-semibold"><td>{t('docs.totalTtc')}</td><td className="text-end">{formatDZD(totals.totalTtcCents)}</td></tr>
                {totals.stampDutyCents > 0 && <tr><td>{t('docs.stampDuty')}</td><td className="text-end">{formatDZD(totals.stampDutyCents)}</td></tr>}
                <tr className="border-y-2 border-black text-[12pt] font-bold"><td>{t('docs.netToPay')}</td><td className="text-end">{formatDZD(totals.netToPayCents)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {kind === 'invoice' && <p className="mt-3 text-[10pt]">{t('docs.paymentMode')} : {paymentLabel}</p>}
        {kind === 'proforma' && (
          <p className="mt-3 text-[10pt] font-semibold">{t('docs.proformaNote')} {t('docs.proformaValidity')}</p>
        )}

        <footer className="mt-16 grid grid-cols-2 gap-8 text-[10pt]">
          <div className="h-24 border-t border-black pt-1">{kind === 'deliveryNote' ? t('docs.receivedBy') : ''}</div>
          <div className="h-24 border-t border-black pt-1 text-end">{t('docs.signatureSeller')}</div>
        </footer>
      </article>
    </div>
  );
}
