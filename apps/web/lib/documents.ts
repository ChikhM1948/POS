import type { SaleDetailDTO, SaleLine } from '@pos-dz/shared';

export type FiscalDocKind = 'invoice' | 'deliveryNote' | 'proforma';

export const DOC_PREFIX: Record<FiscalDocKind, string> = { invoice: 'FA', deliveryNote: 'BL', proforma: 'PF' };

/**
 * Droit de timbre sur paiement en espèces (Code du timbre, barème par tranche de 100 DA ou fraction) :
 *  - <= 300 DA : exonéré
 *  - jusqu'à 30 000 DA : 1 DA / 100 DA  ·  30 000 – 100 000 DA : 1,5 DA / 100 DA  ·  > 100 000 DA : 2 DA / 100 DA
 *  - minimum de perception : 5 DA
 * ⚠ Barème à faire valider par le comptable du commerce : les taux changent avec les lois de finances.
 */
export function computeStampDutyCents(cashAmountCents: number): number {
  if (cashAmountCents <= 30_000) return 0;
  const units = Math.ceil(cashAmountCents / 10_000); // tranches de 100 DA
  const perUnitCents = cashAmountCents <= 3_000_000 ? 100 : cashAmountCents <= 10_000_000 ? 150 : 200;
  return Math.max(500, units * perUnitCents);
}

export interface DocLineView {
  name: string;
  quantity: number;
  unitHtCents: number;
  taxRate: number;
  totalHtCents: number;
}

export interface DocTotals {
  lines: DocLineView[];
  totalHtCents: number;
  vatByRate: { rate: number; baseCents: number; vatCents: number }[];
  totalVatCents: number;
  totalTtcCents: number;
  stampDutyCents: number;
  netToPayCents: number;
}

const lineTax = (l: SaleLine) => Math.round((l.lineTotalCents * l.taxRate) / (100 + l.taxRate));

export function buildDocTotals(sale: SaleDetailDTO, kind: FiscalDocKind, locale: 'fr' | 'ar'): DocTotals {
  const lines: DocLineView[] = sale.lines.map((l) => {
    const totalHt = l.lineTotalCents - lineTax(l);
    return {
      name: (locale === 'ar' && l.name.ar) || l.name.fr,
      quantity: l.quantity,
      unitHtCents: l.quantity ? Math.round(totalHt / l.quantity) : 0,
      taxRate: l.taxRate,
      totalHtCents: totalHt,
    };
  });
  const rates = new Map<number, { baseCents: number; vatCents: number }>();
  sale.lines.forEach((l, i) => {
    const r = rates.get(l.taxRate) ?? { baseCents: 0, vatCents: 0 };
    r.baseCents += lines[i].totalHtCents;
    r.vatCents += lineTax(l);
    rates.set(l.taxRate, r);
  });
  const vatByRate = [...rates.entries()].map(([rate, v]) => ({ rate, ...v })).sort((a, b) => b.rate - a.rate);
  const totalHtCents = lines.reduce((s, l) => s + l.totalHtCents, 0);
  const totalVatCents = vatByRate.reduce((s, v) => s + v.vatCents, 0);
  const totalTtcCents = sale.lines.reduce((s, l) => s + l.lineTotalCents, 0);
  // Le timbre ne concerne que la part payée en espèces d'une facture ; jamais un BL ni une proforma.
  const cashCents = sale.payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amountCents, 0);
  const stampDutyCents = kind === 'invoice' && sale.type === 'sale' ? sale.totals.stampDutyCents || computeStampDutyCents(cashCents) : 0;
  return { lines, totalHtCents, vatByRate, totalVatCents, totalTtcCents, stampDutyCents, netToPayCents: totalTtcCents + stampDutyCents };
}
