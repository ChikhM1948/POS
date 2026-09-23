'use client';

import type { PaymentMethod, SaleLine, SalePayment, SaleTotals } from '@pos-dz/shared';
import { IconCheckCircle, IconPrinter, IconX } from '../icons';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency, formatDateTime } from '../../lib/format';

export interface CompletedSale {
  number: string;
  createdAtLocal: string;
  lines: SaleLine[];
  totals: SaleTotals;
  payments: SalePayment[];
}

interface Props {
  sale: CompletedSale;
  tenantBranding: { nameFr: string; nameAr?: string; header?: string; footer?: string };
  onClose: () => void;
}

/** Reçu affiché à l'écran après paiement — confirmation visuelle + trace imprimable sur imprimante classique. */
export function Receipt({ sale, tenantBranding, onClose }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const payment = sale.payments[0];
  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    cash: t('receipt.payment.cash'),
    cib: t('receipt.payment.cib'),
    edahabia: t('receipt.payment.edahabia'),
    cheque: t('receipt.payment.cheque'),
    credit: t('receipt.payment.credit'),
    voucher: t('receipt.payment.voucher'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-popover print:max-h-none print:w-auto print:rounded-none print:shadow-none">
        <div className="flex items-center gap-2 bg-emerald-600 px-5 py-4 text-white print:hidden">
          <IconCheckCircle className="h-6 w-6" />
          <div>
            <p className="text-sm font-semibold leading-tight">{t('receipt.paymentAccepted')}</p>
            <p className="text-xs text-emerald-50">{t('receipt.ticket', { number: sale.number })}</p>
          </div>
        </div>

        <div className="receipt-print overflow-y-auto px-6 py-5 text-neutral-900">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="text-base font-bold">{tenantBranding.header ?? tenantBranding.nameFr}</p>
            {tenantBranding.nameAr && (
              <p dir="rtl" className="text-sm text-neutral-600">
                {tenantBranding.nameAr}
              </p>
            )}
            <p className="mt-2 text-xs text-neutral-500">{t('receipt.ticket', { number: sale.number })}</p>
            <p className="text-xs text-neutral-500">{formatDateTime(sale.createdAtLocal, locale)}</p>
          </div>

          <div className="my-3 border-t border-dashed border-neutral-300" />

          <ul className="flex flex-col gap-1.5">
            {sale.lines.map((line) => (
              <li key={`${line.productId}-${line.variantSku ?? ''}`} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span>
                    {line.name.fr} <span className="text-neutral-500">× {line.quantity}</span>
                  </span>
                  <span className="whitespace-nowrap font-medium">{formatDZD(line.lineTotalCents)}</span>
                </div>
                {line.name.ar && (
                  <p dir="rtl" className="text-xs text-neutral-500">
                    {line.name.ar}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-dashed border-neutral-300" />

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>{t('common.subtotal')}</span>
              <span>{formatDZD(sale.totals.subtotalCents)}</span>
            </div>
            {sale.totals.discountTotalCents > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>{t('receipt.discount')}</span>
                <span>-{formatDZD(sale.totals.discountTotalCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500">
              <span>{t('receipt.taxIncluded')}</span>
              <span>{formatDZD(sale.totals.taxTotalCents)}</span>
            </div>
            <div className="mt-1 flex justify-between text-lg font-bold">
              <span>{t('common.total')}</span>
              <span>{formatDZD(sale.totals.grandTotalCents)}</span>
            </div>
          </div>

          {payment && (
            <>
              <div className="my-3 border-t border-dashed border-neutral-300" />
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t('receipt.paymentMethod')}</span>
                  <span className="font-medium">{PAYMENT_LABELS[payment.method]}</span>
                </div>
                {payment.tenderedCents !== undefined && (
                  <div className="flex justify-between text-neutral-500">
                    <span>{t('receipt.received')}</span>
                    <span>{formatDZD(payment.tenderedCents)}</span>
                  </div>
                )}
                {payment.changeCents !== undefined && payment.changeCents > 0 && (
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span>{t('receipt.changeGiven')}</span>
                    <span>{formatDZD(payment.changeCents)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {tenantBranding.footer && (
            <p className="mt-4 text-center text-xs text-neutral-500">{tenantBranding.footer}</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            <IconPrinter className="h-4 w-4" />
            {t('receipt.print')}
          </button>
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <IconX className="h-4 w-4" />
            {t('receipt.newSale')}
          </button>
        </div>
      </div>
    </div>
  );
}
