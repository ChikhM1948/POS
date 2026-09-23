'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import type { StockBalanceDTO, StockMovementDTO, SupplierDTO } from '@pos-dz/shared';

type ManualMovementType = 'purchase' | 'adjustment' | 'inventory_count' | 'spoilage';

const centsToDZD = (cents: number) => (cents / 100).toFixed(2);

interface Props {
  storeId: string;
  product: StockBalanceDTO;
  onClose: () => void;
  onMovementCreated: () => void;
}

/** Saisie d'un mouvement de stock manuel + historique — voir docs/DATA_MODEL.md#stockmovement. */
const MOVEMENT_TYPES = ['purchase', 'adjustment', 'inventory_count', 'spoilage', 'sale', 'refund', 'transfer_in', 'transfer_out'] as const;

export function StockMovementPanel({ storeId, product, onClose, onMovementCreated }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const MOVEMENT_LABELS: Record<string, string> = Object.fromEntries(
    MOVEMENT_TYPES.map((type) => [type, t(`stockMovement.types.${type}`)]),
  );
  const { session } = useAdminAuth();
  const [history, setHistory] = useState<StockMovementDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [type, setType] = useState<ManualMovementType>('purchase');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    if (!session) return;
    const { movements } = await adminFetch<{ movements: StockMovementDTO[] }>(
      session.token,
      `/stock/movements?storeId=${storeId}&productId=${product.productId}`,
    );
    setHistory(movements);
  }

  useEffect(() => {
    loadHistory();
    if (session) {
      adminFetch<{ suppliers: SupplierDTO[] }>(session.token, '/suppliers')
        .then(({ suppliers }) => setSuppliers(suppliers))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, storeId, product.productId]);

  const totalCostCents = Math.round(parseFloat(quantity.replace(',', '.') || '0') * (unitCost ? parseFloat(unitCost.replace(',', '.')) : 0) * 100);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    try {
      const qty = Math.abs(parseFloat(quantity.replace(',', '.')));

      if (type === 'purchase') {
        await adminFetch(session.token, '/stock/purchases', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.productId,
            storeId,
            quantity: qty,
            unitCostCents: unitCost ? Math.round(parseFloat(unitCost.replace(',', '.')) * 100) : 0,
            supplierId: supplierId || undefined,
            paidCents: amountPaid ? Math.round(parseFloat(amountPaid.replace(',', '.')) * 100) : totalCostCents,
            lotNumber: lotNumber || undefined,
            expiryDate: expiryDate || undefined,
            note: note || undefined,
          }),
        });
      } else {
        // Correction/casse imposent leur signe — évite qu'une saisie négative de casse ne fausse le ledger.
        const signedQty = type === 'spoilage' ? -qty : qty;
        await adminFetch(session.token, '/stock/movements', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.productId,
            storeId,
            type,
            quantityDelta: signedQty,
            lotNumber: lotNumber || undefined,
            expiryDate: expiryDate || undefined,
            note: note || undefined,
          }),
        });
      }

      setQuantity('1');
      setUnitCost('');
      setSupplierId('');
      setAmountPaid('');
      setLotNumber('');
      setExpiryDate('');
      setNote('');
      await loadHistory();
      onMovementCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('stockMovement.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">
          {product.name.fr}{' '}
          <span className="font-normal text-neutral-500">
            — {t('stockMovement.currentStock', { qty: product.quantity, unit: product.unit })}
          </span>
        </h3>
        <button onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          {t('common.close')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('stockMovement.typeLabel')}
          <select value={type} onChange={(e) => setType(e.target.value as ManualMovementType)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            {(['purchase', 'adjustment', 'inventory_count', 'spoilage'] as const).map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('stockMovement.quantityLabel')} {type === 'adjustment' || type === 'inventory_count' ? t('stockMovement.quantityHintSigned') : ''}
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        {type === 'purchase' && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('stockMovement.unitCost')}
              <input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('stockMovement.supplier')}
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 focus:border-brand-500">
                <option value="">{t('stockMovement.supplierNone')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('stockMovement.amountPaid')}
              <input
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                inputMode="decimal"
                placeholder={totalCostCents > 0 ? centsToDZD(totalCostCents) : undefined}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
              />
              {supplierId && <span className="text-xs text-neutral-500">{t('stockMovement.amountPaidHint')}</span>}
            </label>
          </>
        )}
        {product.isPerishable && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('stockMovement.lotNumber')}
              <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('stockMovement.expiryDate')}
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
            </label>
          </>
        )}
        <label className="col-span-full flex flex-col gap-1 text-sm font-medium text-neutral-700">
          {t('stockMovement.note')}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('stockMovement.notePlaceholder')} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <button disabled={submitting} type="submit" className="col-span-full w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? t('common.saving') : t('stockMovement.save')}
        </button>
      </form>

      <h4 className="mb-2 text-sm font-semibold text-neutral-700">{t('stockMovement.historyTitle')}</h4>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-1.5">{t('stockMovement.tableDate')}</th>
              <th className="px-3 py-1.5">{t('stockMovement.tableType')}</th>
              <th className="px-3 py-1.5">{t('stockMovement.tableQuantity')}</th>
              <th className="px-3 py-1.5">{t('stockMovement.tableCost')}</th>
              <th className="px-3 py-1.5">{t('stockMovement.tableNote')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-1.5">{formatDateTime(m.createdAtLocal, locale)}</td>
                <td className="px-3 py-1.5">{MOVEMENT_LABELS[m.type] ?? m.type}</td>
                <td className={`px-3 py-1.5 font-medium ${m.quantityDelta < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {m.quantityDelta > 0 ? '+' : ''}
                  {m.quantityDelta}
                </td>
                <td className="px-3 py-1.5">{m.unitCostCents ? formatDZD(m.unitCostCents) : '—'}</td>
                <td className="px-3 py-1.5 text-neutral-500">{m.note ?? '—'}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                  {t('stockMovement.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
