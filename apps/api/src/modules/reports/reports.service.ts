import { Types } from 'mongoose';
import { Sale } from '../../models/Sale';
import type { SalesSummaryDTO, TopProductDTO } from '@pos-dz/shared';

/** Fuseau du marché algérien — les journées commerciales sont regroupées sur cette base, pas UTC. */
const TIMEZONE = 'Africa/Algiers';

interface RangeFilters {
  storeId?: string;
  from: Date;
  to: Date;
}

function baseMatch(tenantId: string, filters: RangeFilters) {
  const match: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    createdAtLocal: { $gte: filters.from, $lte: filters.to },
  };
  if (filters.storeId) match.storeId = new Types.ObjectId(filters.storeId);
  return match;
}

/**
 * Toutes les valeurs proviennent directement du ledger `Sale` — jamais d'un total pré-calculé
 * et stocké ailleurs, pour qu'un rapport ne puisse jamais diverger des ventes qui le composent.
 */
export async function getSalesSummary(tenantId: string, filters: RangeFilters): Promise<SalesSummaryDTO> {
  const saleMatch = { ...baseMatch(tenantId, filters), type: 'sale', status: 'completed' };
  const refundMatch = { ...baseMatch(tenantId, filters), type: 'refund', status: 'completed' };

  const [[totals], [refunds], revenueByDayRaw, revenueByPaymentMethodRaw] = await Promise.all([
    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: null,
          salesCount: { $sum: 1 },
          grossRevenueCents: { $sum: '$totals.grandTotalCents' },
          taxCollectedCents: { $sum: '$totals.taxTotalCents' },
          stampDutyCents: { $sum: '$totals.stampDutyCents' },
        },
      },
    ]),
    Sale.aggregate([
      { $match: refundMatch },
      { $group: { _id: null, refundsCents: { $sum: '$totals.grandTotalCents' }, refundsCount: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAtLocal', timezone: TIMEZONE } },
          revenueCents: { $sum: '$totals.grandTotalCents' },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: saleMatch },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', amountCents: { $sum: '$payments.amountCents' } } },
      { $sort: { amountCents: -1 } },
    ]),
  ]);

  const salesCount = totals?.salesCount ?? 0;
  const grossRevenueCents = totals?.grossRevenueCents ?? 0;
  const refundsCents = refunds?.refundsCents ?? 0;

  return {
    salesCount,
    grossRevenueCents,
    refundsCents,
    refundsCount: refunds?.refundsCount ?? 0,
    netRevenueCents: grossRevenueCents - refundsCents,
    taxCollectedCents: totals?.taxCollectedCents ?? 0,
    stampDutyCents: totals?.stampDutyCents ?? 0,
    averageBasketCents: salesCount > 0 ? Math.round(grossRevenueCents / salesCount) : 0,
    revenueByDay: revenueByDayRaw.map((d) => ({ date: d._id, revenueCents: d.revenueCents, salesCount: d.salesCount })),
    revenueByPaymentMethod: revenueByPaymentMethodRaw.map((p) => ({ method: p._id, amountCents: p.amountCents })),
  };
}

/**
 * Regroupe directement sur `lines.name` figé au moment de la vente (jamais un lookup Product) —
 * cohérent avec l'immuabilité des ventes, voir docs/DATA_MODEL.md#sale.
 */
export async function getTopProducts(tenantId: string, filters: RangeFilters, limit = 10): Promise<TopProductDTO[]> {
  const saleMatch = { ...baseMatch(tenantId, filters), type: 'sale', status: 'completed' };

  const results = await Sale.aggregate([
    { $match: saleMatch },
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.productId',
        nameFr: { $first: '$lines.name.fr' },
        nameAr: { $first: '$lines.name.ar' },
        quantity: { $sum: '$lines.quantity' },
        revenueCents: { $sum: '$lines.lineTotalCents' },
      },
    },
    { $sort: { revenueCents: -1 } },
    { $limit: limit },
  ]);

  return results.map((r) => ({
    productId: String(r._id),
    name: { fr: r.nameFr, ar: r.nameAr },
    quantity: r.quantity,
    revenueCents: r.revenueCents,
  }));
}
