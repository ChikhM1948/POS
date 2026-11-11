'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency, formatDate } from '../../../lib/format';
import { DOC_LABEL_KEY } from '../../../lib/documentKinds';
import { DocumentForm } from '../../../components/admin/DocumentForm';
import { DocumentViewer } from '../../../components/admin/DocumentViewer';
import { DOCUMENT_KINDS } from '@pos-dz/shared';
import type { BusinessDocumentDTO, DocumentListItemDTO } from '@pos-dz/shared';

const PAGE_SIZE = 50;

export default function DocumentsPage() {
  const { t, locale } = useTranslation();
  const { session } = useAdminAuth();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DocumentListItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<BusinessDocumentDTO | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (kind) params.set('kind', kind);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const res = await adminFetch<{ documents: DocumentListItemDTO[]; total: number }>(session.token, `/documents?${params}`);
      setItems(res.documents);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [session, kind, status, search, page]);

  useEffect(() => {
    const id = setTimeout(load, search ? 250 : 0); // petit délai pendant la frappe
    return () => clearTimeout(id);
  }, [load, search]);

  async function view(id: string) {
    if (!session) return;
    try {
      const { document } = await adminFetch<{ document: BusinessDocumentDTO }>(session.token, `/documents/${id}`);
      setOpen(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('documents.errorLoad'));
    }
  }

  const field = 'rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500';
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {creating && <DocumentForm onCancel={() => setCreating(false)} onCreated={(doc) => { setCreating(false); setOpen(doc); load(); }} />}
      {open && <DocumentViewer doc={open} onClose={() => { setOpen(null); load(); }} onChanged={setOpen} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
          {t('documents.title')} {total > 0 && <span className="text-sm font-normal text-neutral-500">({total})</span>}
        </h1>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          + {t('documents.newDocument')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('documents.searchPlaceholder')} className={`${field} min-w-[16rem] flex-1`} />
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className={field}>
          <option value="">{t('documents.allKinds')}</option>
          {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{t(`docs.${DOC_LABEL_KEY[k]}`)}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
          <option value="">{t('documents.allStatuses')}</option>
          <option value="issued">{t('documents.statusIssued')}</option>
          <option value="cancelled">{t('documents.statusCancelled')}</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-neutral-500">
              <th className="px-3 py-2 text-start font-medium">{t('documents.colNumber')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('documents.colType')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('documents.colDate')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('documents.colClient')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('documents.colRef')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('documents.colTotal')}</th>
              <th className="px-3 py-2 text-start font-medium">{t('documents.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} onClick={() => view(d.id)} className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-3 py-2 font-mono text-xs">{d.number}</td>
                <td className="px-3 py-2">{t(`docs.${DOC_LABEL_KEY[d.kind]}`)}</td>
                <td className="px-3 py-2">{formatDate(d.issueDate, locale)}</td>
                <td className="px-3 py-2">{d.buyerName}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{d.sourceDocumentNumber ?? d.saleNumber ?? ''}</td>
                <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(d.totalTtcCents, locale)}</td>
                <td className="px-3 py-2">
                  <span className={d.status === 'cancelled' ? 'text-red-600' : 'text-emerald-700'}>
                    {d.status === 'cancelled' ? t('documents.statusCancelled') : t('documents.statusIssued')}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-500">{t('documents.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-neutral-300 px-3 py-1 disabled:opacity-40">‹</button>
          <span className="tabular-nums text-neutral-600">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-neutral-300 px-3 py-1 disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}
