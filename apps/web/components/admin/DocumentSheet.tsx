'use client';

import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { DOC_LABEL_KEY, showsPrices } from '../../lib/documentKinds';
import type { BusinessDocumentDTO } from '@pos-dz/shared';

const idLine = (pairs: [string, string | undefined][]) => pairs.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

interface Props {
  doc: BusinessDocumentDTO;
  /** Logo et téléphone viennent des paramètres du commerce, pas du document figé. */
  logoUrl?: string;
  phone?: string;
}

/** Rendu A4 d'un document émis, imprimable via window.print() (voir .doc-print dans globals.css). */
export function DocumentSheet({ doc, logoUrl, phone }: Props) {
  const { t, locale } = useTranslation();
  const money = (c: number) => formatCurrency(c, locale);
  const prices = showsPrices(doc.kind);
  const title = t(`docs.${DOC_LABEL_KEY[doc.kind]}`);
  const legalIncomplete = !doc.seller.nif || !doc.seller.nis || !doc.seller.rc || !doc.seller.ai || !doc.seller.address;
  const paymentLabel = doc.payments?.length
    ? doc.payments.map((p) => `${t(`common.paymentMethods.${p.method}`)} (${money(p.amountCents)})`).join(', ')
    : doc.paymentMethod
      ? t(`common.paymentMethods.${doc.paymentMethod}`)
      : '';
  const date = (iso: string) => formatDateTime(iso, locale).split(/[ ,]/)[0];

  return (
    <article className="doc-print relative mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-[12mm] text-[11pt] leading-snug text-black shadow">
      {doc.status === 'cancelled' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded border-8 border-red-600/40 px-8 py-2 text-7xl font-black uppercase tracking-widest text-red-600/40">{t('docs.cancelledStamp')}</span>
        </div>
      )}
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl && <img src={logoUrl} alt="" className="h-16 w-16 object-contain" />}
          <div>
            <p className="text-lg font-bold">{doc.seller.name}</p>
            {doc.seller.address && <p>{doc.seller.address}</p>}
            {phone && <p>{t('docs.phone')} : {phone}</p>}
            <p className="text-[9.5pt]">{idLine([['NIF', doc.seller.nif], ['NIS', doc.seller.nis]])}</p>
            <p className="text-[9.5pt]">{idLine([['RC', doc.seller.rc], ['AI', doc.seller.ai]])}</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold uppercase">{title}</p>
          <p>{t('docs.number')} {doc.number}</p>
          <p>{t('docs.date')} : {date(doc.issueDate)}</p>
          {doc.validUntil && <p>{doc.kind === 'invoice' ? t('docs.dueDate') : t('docs.validUntil')} : {date(doc.validUntil)}</p>}
          {doc.saleNumber && <p className="text-[9.5pt]">{t('docs.saleRef')} : {doc.saleNumber}</p>}
          {doc.sourceDocumentNumber && <p className="text-[9.5pt]">{t('docs.sourceRef')} : {doc.sourceDocumentNumber}</p>}
        </div>
      </header>

      <section className="my-4 ms-auto w-1/2 rounded border border-black p-2 text-[10pt]">
        <p className="font-semibold">{doc.buyer.name}</p>
        {doc.buyer.address && <p>{doc.buyer.address}</p>}
        <p>{idLine([['NIF', doc.buyer.nif], ['RC', doc.buyer.rc], ['NIS', doc.buyer.nis], ['AI', doc.buyer.ai]])}</p>
      </section>

      <table className="w-full border-collapse text-[10pt]">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-1 text-start">{t('docs.designation')}</th>
            <th className="py-1 text-end">{t('docs.qty')}</th>
            {prices && <th className="py-1 text-end">{t('docs.unitHt')}</th>}
            {prices && <th className="py-1 text-end">{t('docs.vat')}</th>}
            {prices && <th className="py-1 text-end">{t('docs.totalHt')}</th>}
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i} className="border-b border-neutral-400">
              <td className="py-1">{l.designation}</td>
              <td className="py-1 text-end">{l.quantity}{l.unit ? ` ${l.unit}` : ''}</td>
              {prices && <td className="py-1 text-end">{money(l.unitPriceHtCents)}</td>}
              {prices && <td className="py-1 text-end">{l.taxRate}%</td>}
              {prices && <td className="py-1 text-end">{money(l.totalHtCents)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {prices && (
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
              {doc.totals.vatByRate.map((v) => (
                <tr key={v.taxRate}>
                  <td className="pe-4">{v.taxRate}%</td>
                  <td className="pe-4 text-end">{money(v.baseHtCents)}</td>
                  <td className="text-end">{money(v.taxCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-64 border-collapse">
            <tbody>
              <tr><td>{t('docs.totalHt')}</td><td className="text-end">{money(doc.totals.totalHtCents)}</td></tr>
              <tr><td>{t('docs.totalVat')}</td><td className="text-end">{money(doc.totals.totalTaxCents)}</td></tr>
              <tr className="border-t border-black font-semibold"><td>{t('docs.totalTtc')}</td><td className="text-end">{money(doc.totals.totalTtcCents)}</td></tr>
              {doc.totals.stampDutyCents > 0 && <tr><td>{t('docs.stampDuty')}</td><td className="text-end">{money(doc.totals.stampDutyCents)}</td></tr>}
              <tr className="border-y-2 border-black text-[12pt] font-bold"><td>{t('docs.netToPay')}</td><td className="text-end">{money(doc.totals.netToPayCents)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {doc.kind === 'invoice' && paymentLabel && <p className="mt-3 text-[10pt]">{t('docs.paymentMode')} : {paymentLabel}</p>}
      {doc.kind === 'proforma' && <p className="mt-3 text-[10pt] font-semibold">{t('docs.proformaNote')}</p>}
      {doc.notes && <p className="mt-3 whitespace-pre-line text-[10pt]"><span className="font-semibold">{t('docs.notes')} : </span>{doc.notes}</p>}
      {legalIncomplete && <p className="no-print mt-3 text-[9pt] text-amber-700">{t('docs.missingLegal')}</p>}

      <footer className="mt-16 grid grid-cols-2 gap-8 text-[10pt]">
        <div className="h-24 border-t border-black pt-1">{doc.kind === 'delivery_note' ? t('docs.receivedBy') : ''}</div>
        <div className="h-24 border-t border-black pt-1 text-end">{t('docs.signatureSeller')}</div>
      </footer>
    </article>
  );
}
