'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { DOC_LABEL_KEY } from '../../lib/documentKinds';
import { DocumentViewer } from './DocumentViewer';
import { PartyFields } from './PartyFields';
import type { BusinessDocumentDTO, DocumentKind, DocumentListItemDTO, DocumentParty, SaleDetailDTO } from '@pos-dz/shared';

interface Props {
  sale: SaleDetailDTO;
  kind: DocumentKind;
  onClose: () => void;
}

/**
 * Émet (ou rouvre) le document fiscal d'un ticket de caisse. Si ce ticket a déjà son document de ce
 * type, on l'affiche directement : le numéro est attribué une seule fois, à l'émission.
 */
export function SaleDocumentDialog({ sale, kind, onClose }: Props) {
  const { t } = useTranslation();
  const { session } = useAdminAuth();
  const [doc, setDoc] = useState<BusinessDocumentDTO | null>(null);
  const [checking, setChecking] = useState(true);
  const [buyer, setBuyer] = useState<DocumentParty>({ name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let live = true;
    (async () => {
      try {
        const { documents } = await adminFetch<{ documents: DocumentListItemDTO[] }>(session.token, `/documents?saleId=${sale.id}&kind=${kind}&status=issued`);
        if (documents[0]) {
          const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, `/documents/${documents[0].id}`);
          if (live) setDoc(document);
        }
      } catch {
        /* le formulaire d'émission reste disponible ; l'API rejouera l'idempotence à l'émission */
      } finally {
        if (live) setChecking(false);
      }
    })();
    return () => { live = false; };
  }, [session, sale.id, kind]);

  async function issue() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, '/documents/from-sale', {
        method: 'POST',
        body: JSON.stringify({ saleId: sale.id, kind, buyer }),
      });
      setDoc(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('docs.errorIssue'));
    } finally {
      setBusy(false);
    }
  }

  if (doc) return <DocumentViewer doc={doc} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center scrim p-4">
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-neutral-900">{t(`docs.${DOC_LABEL_KEY[kind]}`)} · {sale.number}</h2>
        {checking ? (
          <p className="text-sm text-neutral-500">{t('common.loading')}</p>
        ) : (
          <>
            <p className="text-xs text-neutral-500">{t('docs.clientNote')}</p>
            <PartyFields value={buyer} onChange={setBuyer} />
            <p className="text-xs text-neutral-500">{t('docs.issueNote')}</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">{t('common.cancel')}</button>
              <button disabled={busy} onClick={issue} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {busy ? t('docs.issuing') : t('docs.issueAndShow')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
