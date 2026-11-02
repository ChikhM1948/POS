'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';
import { DOC_LABEL_KEY } from '../../lib/documentKinds';
import { PartyFields } from './PartyFields';
import { DOCUMENT_KINDS, computeDocumentLine, computeDocumentTotals, documentStampDuty } from '@pos-dz/shared';
import type { BusinessDocumentDTO, DocumentKind, DocumentParty, PaymentMethod, ProductDTO, TaxRate } from '@pos-dz/shared';

interface DraftLine {
  productId?: string;
  designation: string;
  quantity: string;
  unitHt: string; // en DA, saisie libre ("12,50")
  discount: string;
  taxRate: TaxRate;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'];
const emptyLine = (): DraftLine => ({ designation: '', quantity: '1', unitHt: '', discount: '', taxRate: 19 });

/** "12,50" ou "12.5" → 1250 centimes ; vide ou invalide → 0. */
const toCents = (v: string) => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const toQty = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

interface Props {
  onCreated: (doc: BusinessDocumentDTO) => void;
  onCancel: () => void;
}

export function DocumentForm({ onCreated, onCancel }: Props) {
  const { t, locale } = useTranslation();
  const { session } = useAdminAuth();
  const money = (c: number) => formatCurrency(c, locale);
  const [kind, setKind] = useState<DocumentKind>('quote');
  const [buyer, setBuyer] = useState<DocumentParty>({ name: '' });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    adminFetch<{ products: ProductDTO[] }>(session.token, '/products').then(({ products }) => setProducts(products.filter((p) => p.active))).catch(() => undefined);
  }, [session]);

  const computed = useMemo(() => {
    const valid = lines.filter((l) => l.designation.trim() && toQty(l.quantity) > 0);
    const docLines = valid.map((l) => computeDocumentLine({
      designation: l.designation.trim(), quantity: toQty(l.quantity), unitPriceHtCents: toCents(l.unitHt), discountCents: toCents(l.discount), taxRate: l.taxRate,
    }));
    const ttc = docLines.reduce((s, l) => s + l.totalTtcCents, 0);
    return { valid, docLines, totals: computeDocumentTotals(docLines, documentStampDuty(kind, ttc, payment || undefined)) };
  }, [lines, kind, payment]);

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    // Le prix catalogue est TTC (c'est celui que la caisse applique) : on en déduit le HT.
    const ht = Math.round((p.sellingPriceCents * 100) / (100 + p.taxRate)) / 100;
    const line: DraftLine = { productId: p.id, designation: p.name.fr, quantity: '1', unitHt: String(ht).replace('.', ','), discount: '', taxRate: p.taxRate };
    setLines((ls) => (ls.length === 1 && !ls[0].designation && !ls[0].unitHt ? [line] : [...ls, line]));
  }

  async function submit() {
    if (!session) return;
    if (computed.valid.length === 0) return setError(t('documents.errorLines'));
    setBusy(true);
    setError(null);
    try {
      const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, '/documents', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          buyer,
          lines: computed.valid.map((l) => ({
            productId: l.productId, designation: l.designation.trim(), quantity: toQty(l.quantity),
            unitPriceHtCents: toCents(l.unitHt), discountCents: toCents(l.discount), taxRate: l.taxRate,
          })),
          paymentMethod: payment || undefined,
          validUntil: validUntil ? new Date(`${validUntil}T23:59:59+01:00`).toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      onCreated(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docs.errorIssue'));
    } finally {
      setBusy(false);
    }
  }

  const input = 'rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-brand-500';

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4">
      <div className="flex w-full max-w-4xl flex-col gap-4 rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">{t('documents.newDocument')}</h2>
          <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className={input} aria-label={t('documents.colType')}>
            {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{t(`docs.${DOC_LABEL_KEY[k]}`)}</option>)}
          </select>
        </div>
        <p className="-mt-2 text-xs text-neutral-500">{t('documents.numberingNote')}</p>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-neutral-700">{t('documents.buyerSection')}</h3>
          <PartyFields value={buyer} onChange={setBuyer} />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-700">{t('documents.linesSection')}</h3>
            <select value="" onChange={(e) => addProduct(e.target.value)} className={input} aria-label={t('documents.pickProduct')}>
              <option value="">{t('documents.pickProduct')}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name.fr} ({p.sku})</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-xs text-neutral-500">
                  <th className="text-start font-medium">{t('documents.designation')}</th>
                  <th className="w-20 text-start font-medium">{t('documents.quantity')}</th>
                  <th className="w-28 text-start font-medium">{t('documents.unitHt')}</th>
                  <th className="w-24 text-start font-medium">{t('documents.discount')}</th>
                  <th className="w-20 text-start font-medium">{t('documents.vatRate')}</th>
                  <th className="w-28 text-end font-medium">{t('documents.lineTotal')}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const calc = computeDocumentLine({ designation: l.designation, quantity: toQty(l.quantity), unitPriceHtCents: toCents(l.unitHt), discountCents: toCents(l.discount), taxRate: l.taxRate });
                  return (
                    <tr key={i}>
                      <td className="pe-1 pt-1"><input value={l.designation} onChange={(e) => setLine(i, { designation: e.target.value })} className={`${input} w-full`} /></td>
                      <td className="pe-1 pt-1"><input inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={`${input} w-full`} /></td>
                      <td className="pe-1 pt-1"><input inputMode="decimal" value={l.unitHt} onChange={(e) => setLine(i, { unitHt: e.target.value })} className={`${input} w-full`} /></td>
                      <td className="pe-1 pt-1"><input inputMode="decimal" value={l.discount} onChange={(e) => setLine(i, { discount: e.target.value })} className={`${input} w-full`} /></td>
                      <td className="pe-1 pt-1">
                        <select value={l.taxRate} onChange={(e) => setLine(i, { taxRate: Number(e.target.value) as TaxRate })} className={`${input} w-full`}>
                          {[19, 9, 0].map((r) => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="pt-1 text-end tabular-nums">{money(calc.totalHtCents)}</td>
                      <td className="pt-1 text-end">
                        {lines.length > 1 && <button type="button" aria-label={t('documents.removeLine')} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="px-1 text-neutral-400 hover:text-red-600">×</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="self-start text-sm font-medium text-brand-600 hover:underline">+ {t('documents.addLine')}</button>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-0.5 text-xs font-medium text-neutral-600">
              {t('documents.paymentMethod')}
              <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | '')} className={input}>
                <option value="">{t('documents.noPayment')}</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`common.paymentMethods.${m}`)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-neutral-600">
              {t('documents.validUntil')}
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={input} />
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-neutral-600">
              {t('documents.notes')}
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
            </label>
          </div>
          <table className="h-fit self-end text-sm">
            <tbody>
              <tr><td className="text-neutral-600">{t('documents.totalHt')}</td><td className="text-end tabular-nums">{money(computed.totals.totalHtCents)}</td></tr>
              <tr><td className="text-neutral-600">{t('documents.totalVat')}</td><td className="text-end tabular-nums">{money(computed.totals.totalTaxCents)}</td></tr>
              <tr className="border-t font-medium"><td>{t('documents.totalTtc')}</td><td className="text-end tabular-nums">{money(computed.totals.totalTtcCents)}</td></tr>
              {computed.totals.stampDutyCents > 0 && <tr><td className="text-neutral-600">{t('documents.stampDuty')}</td><td className="text-end tabular-nums">{money(computed.totals.stampDutyCents)}</td></tr>}
              <tr className="border-t-2 text-base font-bold"><td>{t('documents.netToPay')}</td><td className="text-end tabular-nums">{money(computed.totals.netToPayCents)}</td></tr>
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? t('documents.submitting') : t('documents.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
