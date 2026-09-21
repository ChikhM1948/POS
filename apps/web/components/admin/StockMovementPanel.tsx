'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import type { StockBalanceDTO, StockMovementDTO } from '@pos-dz/shared';

type ManualMovementType = 'purchase' | 'adjustment' | 'inventory_count' | 'spoilage';

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Achat (réception fournisseur)',
  adjustment: 'Correction manuelle',
  inventory_count: "Comptage d'inventaire",
  spoilage: 'Casse / péremption',
  sale: 'Vente',
  refund: 'Retour',
  transfer_in: 'Transfert entrant',
  transfer_out: 'Transfert sortant',
};

const formatDZD = (cents: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

interface Props {
  storeId: string;
  product: StockBalanceDTO;
  onClose: () => void;
  onMovementCreated: () => void;
}

/** Saisie d'un mouvement de stock manuel + historique — voir docs/DATA_MODEL.md#stockmovement. */
export function StockMovementPanel({ storeId, product, onClose, onMovementCreated }: Props) {
  const { session } = useAdminAuth();
  const [history, setHistory] = useState<StockMovementDTO[]>([]);
  const [type, setType] = useState<ManualMovementType>('purchase');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, storeId, product.productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    try {
      const qty = parseFloat(quantity.replace(',', '.'));
      // Achat/casse imposent leur signe — évite qu'une saisie négative d'achat ne fausse le ledger.
      const signedQty = type === 'spoilage' ? -Math.abs(qty) : type === 'purchase' ? Math.abs(qty) : qty;

      await adminFetch(session.token, '/stock/movements', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.productId,
          storeId,
          type,
          quantityDelta: signedQty,
          unitCostCents: unitCost ? Math.round(parseFloat(unitCost.replace(',', '.')) * 100) : undefined,
          lotNumber: lotNumber || undefined,
          expiryDate: expiryDate || undefined,
          note: note || undefined,
        }),
      });

      setQuantity('1');
      setUnitCost('');
      setLotNumber('');
      setExpiryDate('');
      setNote('');
      await loadHistory();
      onMovementCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">
          {product.name.fr} <span className="font-normal text-neutral-500">— stock actuel : {product.quantity} {product.unit}</span>
        </h3>
        <button onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Fermer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Type de mouvement
          <select value={type} onChange={(e) => setType(e.target.value as ManualMovementType)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            {(['purchase', 'adjustment', 'inventory_count', 'spoilage'] as const).map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Quantité {type === 'adjustment' || type === 'inventory_count' ? '(+ ou -)' : ''}
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" required className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        {type === 'purchase' && (
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Coût unitaire (DZD)
            <input value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
          </label>
        )}
        {product.isPerishable && (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              N° de lot
              <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              Date de péremption
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
            </label>
          </>
        )}
        <label className="col-span-full flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. inventaire annuel, verre cassé…" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <button disabled={submitting} type="submit" className="col-span-full w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Enregistrement…' : 'Enregistrer le mouvement'}
        </button>
      </form>

      <h4 className="mb-2 text-sm font-semibold text-neutral-700">Historique récent</h4>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-1.5">Date</th>
              <th className="px-3 py-1.5">Type</th>
              <th className="px-3 py-1.5">Quantité</th>
              <th className="px-3 py-1.5">Coût</th>
              <th className="px-3 py-1.5">Note</th>
            </tr>
          </thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-1.5">{new Date(m.createdAtLocal).toLocaleString('fr-DZ')}</td>
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
                  Aucun mouvement enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
