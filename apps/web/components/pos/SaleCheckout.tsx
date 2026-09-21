'use client';

import { useState } from 'react';
import { useCreateSale } from '../../hooks/useCreateSale';
import { renderReceiptToImageData } from '../../lib/print/receipt-renderer';
import { imageDataToEscPosRaster, buildPrintJob } from '../../lib/print/escpos-raster';
import { CashPaymentModal } from './CashPaymentModal';
import type { CompletedSale } from './Receipt';
import { IconBanknote, IconCreditCard } from '../icons';
import type { SaleLine, SalePayment, SaleTotals } from '@pos-dz/shared';

const formatDZD = (cents: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

interface Props {
  deviceId: string;
  storeId: string;
  storeCode: string;
  registerId: string;
  cashierId: string;
  cartLines: SaleLine[];
  tenantBranding: { nameFr: string; nameAr?: string; header?: string; footer?: string };
  onSaleComplete: (sale: CompletedSale) => void;
}

/** Flux caisse : calcule les totaux, encaisse (espèces avec monnaie, ou CIB), écrit la vente en local, imprime le ticket. */
export function SaleCheckout({ deviceId, storeId, storeCode, registerId, cashierId, cartLines, tenantBranding, onSaleComplete }: Props) {
  const { createSale } = useCreateSale(deviceId);
  const [showCashModal, setShowCashModal] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<SalePayment['method'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = computeTotals(cartLines);
  const isBusy = processingMethod !== null;

  async function finalize(payments: SalePayment[]) {
    setError(null);
    try {
      const sale = await createSale({ storeId, storeCode, registerId, cashierId, lines: cartLines, payments, totals });

      // L'impression thermique (Electron) est facultative : son échec ne doit jamais bloquer la vente,
      // déjà actée localement — voir docs/SYNC_STRATEGY.md.
      try {
        if (typeof window !== 'undefined' && window.posBridge) {
          const imageData = await renderReceiptToImageData({
            widthMm: 80,
            header: tenantBranding.header ?? tenantBranding.nameFr,
            footer: tenantBranding.footer,
            saleNumber: sale.number,
            lines: cartLines,
            totals,
            dateLabel: new Date(sale.createdAtLocal).toLocaleString('fr-DZ'),
          });
          const raster = imageDataToEscPosRaster(imageData);
          const job = buildPrintJob(raster);
          await window.posBridge.printThermal(job);
        }
      } catch (printErr) {
        console.error('Impression thermique échouée :', printErr);
      }

      setShowCashModal(false);
      onSaleComplete({ number: sale.number, createdAtLocal: sale.createdAtLocal, lines: cartLines, totals, payments });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'encaissement. Réessayez.");
    } finally {
      setProcessingMethod(null);
    }
  }

  async function handleCib() {
    setProcessingMethod('cib');
    await finalize([{ method: 'cib', amountCents: totals.grandTotalCents }]);
  }

  async function handleCashConfirm(tenderedCents: number) {
    setProcessingMethod('cash');
    await finalize([
      {
        method: 'cash',
        amountCents: totals.grandTotalCents,
        tenderedCents,
        changeCents: Math.max(0, tenderedCents - totals.grandTotalCents),
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1 border-t border-dashed border-neutral-200 pt-3">
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>Sous-total</span>
          <span>{formatDZD(totals.subtotalCents)}</span>
        </div>
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>TVA</span>
          <span>{formatDZD(totals.taxTotalCents)}</span>
        </div>
        <div className="flex items-baseline justify-between text-2xl font-bold text-neutral-900">
          <span>Total</span>
          <span>{formatDZD(totals.grandTotalCents)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isBusy || cartLines.length === 0}
          onClick={() => setShowCashModal(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 py-5 text-base font-semibold text-white shadow-card transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconBanknote className="h-6 w-6" />
          Espèces
        </button>
        <button
          disabled={isBusy || cartLines.length === 0}
          onClick={handleCib}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-5 text-base font-semibold text-white shadow-card transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconCreditCard className="h-6 w-6" />
          {processingMethod === 'cib' ? 'Traitement…' : 'CIB / Edahabia'}
        </button>
      </div>

      {showCashModal && (
        <CashPaymentModal
          totalCents={totals.grandTotalCents}
          submitting={processingMethod === 'cash'}
          onCancel={() => setShowCashModal(false)}
          onConfirm={handleCashConfirm}
        />
      )}
    </div>
  );
}

function computeTotals(lines: SaleLine[]): SaleTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const discountTotalCents = lines.reduce((sum, l) => sum + l.discountCents, 0);
  const taxTotalCents = lines.reduce((sum, l) => sum + Math.round((l.lineTotalCents * l.taxRate) / (100 + l.taxRate)), 0);
  const grandTotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  return { subtotalCents, taxTotalCents, stampDutyCents: 0, discountTotalCents, grandTotalCents };
}

declare global {
  interface Window {
    posBridge?: {
      printThermal: (job: Uint8Array) => Promise<void>;
    };
  }
}
