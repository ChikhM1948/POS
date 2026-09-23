import type { RevenueByPaymentMethodPoint } from '@pos-dz/shared';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';

// Slots catégoriels validés (ordre fixe — voir dataviz skill palette.md), jamais réassignés
// dynamiquement : un moyen de paiement garde toujours la même couleur d'un rapport à l'autre.
const CATEGORICAL_ORDER = ['cash', 'cib', 'edahabia', 'cheque', 'credit', 'voucher'] as const;
const CATEGORICAL_SLOTS: Record<(typeof CATEGORICAL_ORDER)[number], string> = {
  cash: '#2a78d6',
  cib: '#eb6834',
  edahabia: '#1baf7a',
  cheque: '#eda100',
  credit: '#e87ba4',
  voucher: '#008300',
};

/**
 * Barres horizontales, étiquetage direct obligatoire (le fond clair de certains slots — vert,
 * jaune, magenta — passe sous 3:1 de contraste ; le texte hors barre est le mécanisme de secours
 * prescrit par le skill dataviz plutôt que du texte blanc dans la barre).
 */
export function PaymentBreakdown({ data }: { data: RevenueByPaymentMethodPoint[] }) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale, { maximumFractionDigits: 0 });
  const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORICAL_ORDER.map((m) => [m, t(`common.paymentMethods.${m}`)]),
  );

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">{t('paymentBreakdown.empty')}</p>;
  }

  const max = Math.max(...data.map((d) => d.amountCents));

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.method} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-neutral-600">{PAYMENT_LABELS[d.method] ?? d.method}</span>
          <div className="h-6 flex-1 rounded-[4px] bg-neutral-100">
            <div
              className="h-6 rounded-[4px]"
              style={{ width: `${(d.amountCents / max) * 100}%`, backgroundColor: CATEGORICAL_SLOTS[d.method as keyof typeof CATEGORICAL_SLOTS] ?? '#898781' }}
            />
          </div>
          <span className="w-24 shrink-0 text-end text-sm font-medium text-neutral-900">{formatDZD(d.amountCents)}</span>
        </div>
      ))}
    </div>
  );
}
