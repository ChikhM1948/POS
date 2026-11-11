'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDate } from '../../lib/format';
import { IconPrinter } from '../icons';
import type { ReorderGroupDTO } from '@pos-dz/shared';

const groupKey = (g: ReorderGroupDTO) => g.supplierId ?? '__none__';

/**
 * Produits sous leur seuil, groupés par fournisseur habituel : un bon de commande par fournisseur,
 * quantités ajustables, impression (une page par bon) ou copie en texte pour WhatsApp.
 */
export function ReorderPanel({ storeId }: { storeId: string }) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const [groups, setGroups] = useState<ReorderGroupDTO[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({}); // `${groupKey}|${productId}` → quantité saisie
  const [copied, setCopied] = useState<string | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !storeId) return;
    adminFetch<{ groups: ReorderGroupDTO[] }>(session.token, `/stock/reorder?storeId=${storeId}`)
      .then(({ groups }) => {
        setGroups(groups);
        setQty(Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [`${groupKey(g)}|${i.productId}`, String(i.suggestedQuantity)]))));
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.errorLoading')));
  }, [session, storeId, t]);

  const lines = (g: ReorderGroupDTO) =>
    g.items
      .map((i) => ({ item: i, quantity: Math.max(0, parseFloat((qty[`${groupKey(g)}|${i.productId}`] ?? '').replace(',', '.')) || 0) }))
      .filter((l) => l.quantity > 0);
  const total = (g: ReorderGroupDTO) => lines(g).reduce((s, l) => s + Math.round(l.quantity * l.item.lastUnitCostCents), 0);

  async function copyOrder(g: ReorderGroupDTO) {
    const text = [
      `${t('inventory.orderTitle')} — ${g.supplierName ?? t('inventory.noSupplier')}`,
      formatDate(new Date(), locale),
      '',
      ...lines(g).map((l) => `• ${l.item.name.fr} (${l.item.sku}) × ${l.quantity} ${l.item.unit}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(groupKey(g));
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  function printOrder(g: ReorderGroupDTO) {
    setPrinting(groupKey(g));
    // Laisse React rendre uniquement ce bon dans la zone imprimable avant d'ouvrir la boîte d'impression.
    setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 50);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500 print:hidden">{t('inventory.reorderIntro')}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {groups.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500 print:hidden">
          {t('inventory.reorderEmpty')}
        </p>
      )}

      {groups.map((g) => {
        const key = groupKey(g);
        // Les règles @media print globales (globals.css) n'impriment que .doc-print : seul le bon choisi sort.
        const hidden = printing === null ? '' : printing === key ? 'doc-print doc-overlay' : 'print:hidden';
        return (
          <section key={key} className={`rounded-xl bg-white shadow-card ${hidden}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  <span className="hidden print:inline">{t('inventory.orderTitle')} : </span>
                  {g.supplierName ?? t('inventory.noSupplier')}
                </h3>
                <p className="text-xs text-neutral-500">
                  {g.supplierPhone && `${g.supplierPhone} · `}
                  <span className="hidden print:inline">{t('inventory.orderDate')} : {formatDate(new Date(), locale)}</span>
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => copyOrder(g)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                  {copied === key ? t('inventory.copied') : t('inventory.copy')}
                </button>
                <button onClick={() => printOrder(g)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700">
                  <IconPrinter className="h-4 w-4" />
                  {t('inventory.print')}
                </button>
              </div>
            </header>
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100 text-start text-xs font-medium text-neutral-500">
                <tr>
                  <th className="px-4 py-2">{t('inventory.product')}</th>
                  <th className="px-4 py-2 print:hidden">{t('inventory.currentQty')}</th>
                  <th className="px-4 py-2 print:hidden">{t('inventory.threshold')}</th>
                  <th className="px-4 py-2">{t('inventory.orderQty')}</th>
                  <th className="px-4 py-2">{t('inventory.unitCost')}</th>
                  <th className="px-4 py-2 text-end">{t('inventory.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((i) => {
                  const q = qty[`${key}|${i.productId}`] ?? '';
                  const n = Math.max(0, parseFloat(q.replace(',', '.')) || 0);
                  return (
                    <tr key={i.productId} className="border-b border-neutral-50 last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-neutral-900">{i.name.fr}</p>
                        <p className="font-mono text-xs text-neutral-500">{i.sku}</p>
                      </td>
                      <td className="px-4 py-2 text-red-600 print:hidden">{i.quantity} {i.unit}</td>
                      <td className="px-4 py-2 text-neutral-600 print:hidden">{i.lowStockThreshold}</td>
                      <td className="px-4 py-2">
                        <input
                          value={q}
                          onChange={(e) => setQty((prev) => ({ ...prev, [`${key}|${i.productId}`]: e.target.value }))}
                          inputMode="decimal"
                          className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-neutral-900 focus:border-brand-500 print:border-0 print:p-0"
                        />{' '}
                        <span className="text-xs text-neutral-500">{i.unit}</span>
                      </td>
                      <td className="px-4 py-2 text-neutral-600">{i.lastUnitCostCents ? formatDZD(i.lastUnitCostCents) : '—'}</td>
                      <td className="px-4 py-2 text-end tabular-nums text-neutral-900">{i.lastUnitCostCents ? formatDZD(Math.round(n * i.lastUnitCostCents)) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-end text-sm font-medium text-neutral-500">{t('inventory.estimatedTotal')}</td>
                  <td className="px-4 py-2 text-end text-sm font-semibold tabular-nums text-neutral-900">{formatDZD(total(g))}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        );
      })}
    </div>
  );
}
