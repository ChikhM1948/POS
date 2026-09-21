'use client';

import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '../../lib/adminAuth';
import { adminFetch } from '../../lib/adminApi';
import type { CreateRefundInput, PaymentMethod, SaleDetailDTO } from '@pos-dz/shared';

const formatDZD = (cents: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  cib: 'CIB',
  edahabia: 'Edahabia',
  cheque: 'Chèque',
  credit: "Avoir / bon d'achat",
  voucher: "Bon d'achat",
};

interface Props {
  sale: SaleDetailDTO;
  onClose: () => void;
  onRefundCreated: () => void;
}

/** Retour partiel ou total — une quantité par ligne, plafonnée à ce qui n'a pas déjà été retourné. */
export function RefundForm({ sale, onClose, onRefundCreated }: Props) {
  const { session } = useAdminAuth();
  const remaining = sale.lines.map((l, i) => l.quantity - (sale.refundedQuantities?.[i] ?? 0));
  const [quantities, setQuantities] = useState<number[]>(sale.lines.map(() => 0));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewCents = sale.lines.reduce((sum, l, i) => {
    const qty = quantities[i];
    if (!qty) return sum;
    const netUnit = Math.round(l.lineTotalCents / l.quantity);
    return sum + netUnit * qty;
  }, 0);

  function setQuantity(index: number, value: number) {
    setQuantities((prev) => prev.map((q, i) => (i === index ? Math.max(0, Math.min(value, remaining[index])) : q)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);

    const lines = sale.lines
      .map((l, i) => ({ productId: l.productId, variantSku: l.variantSku, quantity: quantities[i] }))
      .filter((l) => l.quantity > 0);

    if (lines.length === 0) {
      setError('Indiquez au moins une quantité à retourner.');
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateRefundInput = { lines, paymentMethod, restock, note: note || undefined };
      await adminFetch(session.token, `/sales/${sale.id}/refund`, { method: 'POST', body: JSON.stringify(input) });
      onRefundCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du retour.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-neutral-900">Faire un retour</h4>
        <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
          Annuler
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="py-1.5">Article</th>
            <th className="py-1.5">Vendu</th>
            <th className="py-1.5">Déjà retourné</th>
            <th className="py-1.5">À retourner</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((l, i) => (
            <tr key={i} className="border-t border-neutral-200">
              <td className="py-1.5">{l.name.fr}</td>
              <td className="py-1.5">{l.quantity}</td>
              <td className="py-1.5">{sale.refundedQuantities?.[i] ?? 0}</td>
              <td className="py-1.5">
                <input
                  type="number"
                  min={0}
                  max={remaining[i]}
                  value={quantities[i]}
                  disabled={remaining[i] === 0}
                  onChange={(e) => setQuantity(i, parseInt(e.target.value || '0', 10))}
                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-neutral-900 focus:border-brand-500 disabled:bg-neutral-100 disabled:text-neutral-400"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Remboursé via
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Note (optionnel)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. article défectueux" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={restock}
          onChange={(e) => setRestock(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
        />
        Remettre les articles en stock
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">Montant du retour : {formatDZD(previewCents)}</p>
        <button disabled={submitting || previewCents === 0} type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Enregistrement…' : 'Confirmer le retour'}
        </button>
      </div>
    </form>
  );
}
