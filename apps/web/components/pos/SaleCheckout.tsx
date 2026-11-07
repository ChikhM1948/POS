'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { useCreateSale } from '../../hooks/useCreateSale';
import { renderReceiptToImageData } from '../../lib/print/receipt-renderer';
import { imageDataToEscPosRaster, buildPrintJob } from '../../lib/print/escpos-raster';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { CashPaymentModal } from './CashPaymentModal';
import { CustomerCreditModal } from './CustomerCreditModal';
import type { CompletedSale } from './Receipt';
import { IconBanknote, IconCreditCard, IconWallet } from '../icons';
import type { SaleLine, SalePayment, SaleTotals } from '@pos-dz/shared';

interface Props {
  deviceId: string;
  storeId: string;
  storeCode: string;
  registerId: string;
  cashierId: string;
  cartLines: SaleLine[];
  tenantBranding: { nameFr: string; nameAr?: string; logoUrl?: string; header?: string; footer?: string };
  onSaleComplete: (sale: CompletedSale) => void;
}

/** Actions déclenchables au clavier (F2/F3/F4) depuis la page caisse. */
export interface SaleCheckoutHandle {
  payCash: () => void;
  payCib: () => void;
  payCredit: () => void;
}

/** Flux caisse : calcule les totaux, encaisse (espèces avec monnaie, ou CIB), écrit la vente en local, imprime le ticket. */
export const SaleCheckout = forwardRef<SaleCheckoutHandle, Props>(function SaleCheckout(
  { deviceId, storeId, storeCode, registerId, cashierId, cartLines, tenantBranding, onSaleComplete },
  ref,
) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { createSale } = useCreateSale(deviceId);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
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
            logoUrl: tenantBranding.logoUrl,
            footer: tenantBranding.footer,
            saleNumber: sale.number,
            lines: cartLines,
            totals,
            dateLabel: formatDateTime(sale.createdAtLocal, locale),
            locale,
          });
          const raster = imageDataToEscPosRaster(imageData);
          const job = buildPrintJob(raster);
          await window.posBridge.printThermal(job);
        }
      } catch (printErr) {
        console.error('Impression thermique échouée :', printErr);
      }

      setShowCashModal(false);
      setShowCreditModal(false);
      onSaleComplete({ number: sale.number, createdAtLocal: sale.createdAtLocal, lines: cartLines, totals, payments });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saleCheckout.errorGeneric'));
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

  async function handleCreditConfirm(customerId: string, paidNowCents: number) {
    setProcessingMethod('credit');
    const payments: SalePayment[] = [];
    if (paidNowCents > 0) payments.push({ method: 'cash', amountCents: paidNowCents });
    const remainingCents = totals.grandTotalCents - paidNowCents;
    if (remainingCents > 0) payments.push({ method: 'credit', amountCents: remainingCents, customerId });
    await finalize(payments);
  }

  useImperativeHandle(ref, () => ({
    payCash: () => {
      if (!isBusy && cartLines.length > 0) setShowCashModal(true);
    },
    payCib: () => {
      if (!isBusy && cartLines.length > 0) handleCib();
    },
    payCredit: () => {
      if (!isBusy && cartLines.length > 0) setShowCreditModal(true);
    },
  }));

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>{t('common.subtotal')}</span>
          <span>{formatDZD(totals.subtotalCents)}</span>
        </div>
        <div className="flex items-baseline justify-between text-sm text-neutral-500">
          <span>{t('common.tax')}</span>
          <span>{formatDZD(totals.taxTotalCents)}</span>
        </div>
        <div className="flex items-baseline justify-between pt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          <span className="text-base font-medium text-neutral-500">{t('common.total')}</span>
          <span className="tabular-nums">{formatDZD(totals.grandTotalCents)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          disabled={isBusy || cartLines.length === 0}
          onClick={() => setShowCashModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-base font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <IconBanknote className="h-5 w-5" />
          {t('saleCheckout.cash')}
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">F2</kbd>
        </button>
        <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isBusy || cartLines.length === 0}
          onClick={handleCib}
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconCreditCard className="h-4 w-4" />
          {processingMethod === 'cib' ? t('saleCheckout.processing') : 'CIB / Edahabia'}
          <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">F3</kbd>
        </button>
        <button
          disabled={isBusy || cartLines.length === 0}
          onClick={() => setShowCreditModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconWallet className="h-4 w-4" />
          {t('saleCheckout.credit')}
          <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">F4</kbd>
        </button>
        </div>
      </div>

      {showCashModal && (
        <CashPaymentModal
          totalCents={totals.grandTotalCents}
          submitting={processingMethod === 'cash'}
          onCancel={() => setShowCashModal(false)}
          onConfirm={handleCashConfirm}
        />
      )}

      {showCreditModal && (
        <CustomerCreditModal
          deviceId={deviceId}
          totalCents={totals.grandTotalCents}
          submitting={processingMethod === 'credit'}
          onCancel={() => setShowCreditModal(false)}
          onConfirm={handleCreditConfirm}
        />
      )}
    </div>
  );
});

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
      openCashDrawer?: () => Promise<void>;
      pickBackupFolder?: () => Promise<string | null>;
      pickBackupFile?: () => Promise<string | null>;
    };
  }
}
