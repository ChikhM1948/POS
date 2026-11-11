'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { DOC_LABEL_KEY } from '../../lib/documentKinds';
import { DocumentSheet } from './DocumentSheet';
import { DOCUMENT_CONVERSIONS } from '@pos-dz/shared';
import type { BusinessDocumentDTO, DocumentKind, PaymentMethod, TenantSettingsDTO } from '@pos-dz/shared';

interface Props {
  doc: BusinessDocumentDTO;
  onClose: () => void;
  /** Appelé quand le document affiché change (annulation) ou qu'un autre est émis (transformation). */
  onChanged?: (doc: BusinessDocumentDTO) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'];

/** Document plein écran : impression A4, transformation en un autre type, annulation motivée. */
export function DocumentViewer({ doc: initial, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [doc, setDoc] = useState(initial);
  const [tenant, setTenant] = useState<TenantSettingsDTO | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | ''>('');

  useEffect(() => setDoc(initial), [initial]);
  useEffect(() => {
    if (!session) return;
    adminFetch<{ tenant: TenantSettingsDTO }>(session.token, '/tenant').then(({ tenant }) => setTenant(tenant)).catch(() => undefined);
  }, [session]);

  const targets = doc.status === 'issued' ? DOCUMENT_CONVERSIONS[doc.kind] : [];

  async function convert(kind: DocumentKind) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, `/documents/${doc.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({ kind, paymentMethod: kind === 'invoice' && payment ? payment : undefined }),
      });
      setNotice(t('documents.converted', { number: document.number }));
      setDoc(document);
      onChanged?.(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docs.errorIssue'));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, `/documents/${doc.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setDoc(document);
      setCancelling(false);
      setReason('');
      onChanged?.(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docs.errorIssue'));
    } finally {
      setBusy(false);
    }
  }

  const btn = 'rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50';

  return (
    <div className="doc-overlay fixed inset-0 z-50 overflow-auto bg-neutral-200 p-4 print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 rounded-xl border border-neutral-300 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-neutral-900">{t(`docs.${DOC_LABEL_KEY[doc.kind]}`)} · {doc.number}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className={btn}>{t('docs.back')}</button>
            <button onClick={() => window.print()} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">{t('docs.print')}</button>
          </div>
        </div>

        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {doc.status === 'cancelled' && <p className="text-sm text-red-700">{t('documents.cancelledBanner')}{doc.cancelReason ? ` (${doc.cancelReason})` : ''}</p>}

        {targets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-500">{t('documents.convertTo')}</span>
            {targets.map((k) => (
              <button key={k} disabled={busy} onClick={() => convert(k)} className={btn}>{t(`docs.${DOC_LABEL_KEY[k]}`)}</button>
            ))}
            {targets.includes('invoice') && (
              <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | '')} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" aria-label={t('documents.paymentMethod')}>
                <option value="">{t('documents.noPayment')}</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`common.paymentMethods.${m}`)}</option>)}
              </select>
            )}
          </div>
        )}

        {doc.status === 'issued' && (
          cancelling ? (
            <div className="flex flex-wrap items-center gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('documents.cancelReasonPlaceholder')} aria-label={t('documents.cancelReason')} className="min-w-[16rem] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm" />
              <button disabled={busy || !reason.trim()} onClick={cancel} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{t('documents.cancelConfirm')}</button>
              <button onClick={() => setCancelling(false)} className={btn}>{t('common.cancel')}</button>
            </div>
          ) : (
            <button onClick={() => setCancelling(true)} className="self-start text-sm text-red-600 hover:underline">{t('documents.cancelAction')}</button>
          )
        )}

        <details className="text-xs text-neutral-500">
          <summary className="cursor-pointer font-medium text-neutral-600">{t('documents.einvoiceTitle')} · {t(`documents.einvoiceStatus.${doc.einvoice.status}`)}</summary>
          <p className="mt-1">{t('documents.einvoiceNote')}</p>
          <p className="mt-1 break-all tabular-nums">UUID {doc.einvoice.uuid}</p>
          <p className="mt-1 break-all tabular-nums">{t('documents.integrityTitle')} : {doc.integrity.hash}</p>
        </details>
      </div>
      <DocumentSheet doc={doc} logoUrl={tenant?.branding.logoUrl} phone={tenant?.phone} />
    </div>
  );
}
