import { Types } from 'mongoose';
import { Sale } from '../../models/Sale';
import { SupplierLedgerEntry } from '../../models/SupplierLedgerEntry';
import { CustomerLedgerEntry } from '../../models/CustomerLedgerEntry';
import { Supplier } from '../../models/Supplier';
import { Customer } from '../../models/Customer';
import type { TaxReturnDTO, TaxRateBucketDTO, TaxMonthPointDTO, SalesSummaryDTO, TopProductDTO, ProfitSummaryDTO, DebtsSummaryDTO, DebtorDTO } from '@pos-dz/shared';

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

/**
 * Bénéfice = chiffre d'affaires net de TVA moins le coût d'achat figé sur chaque ligne au moment
 * de la vente (`SaleLine.costPriceCents`, jamais un lookup live vers Product). Les retours de la
 * période annulent symétriquement le CA et le coût (voir sales.service.createRefund).
 */
export async function getProfitSummary(tenantId: string, filters: RangeFilters): Promise<ProfitSummaryDTO> {
  const saleMatch = { ...baseMatch(tenantId, filters), type: 'sale', status: 'completed' };
  const refundMatch = { ...baseMatch(tenantId, filters), type: 'refund', status: 'completed' };

  async function netTotals(match: Record<string, unknown>) {
    const [row] = await Sale.aggregate([
      { $match: match },
      { $unwind: '$lines' },
      {
        $group: {
          _id: null,
          revenueCents: { $sum: { $subtract: ['$lines.lineTotalCents', { $multiply: ['$lines.lineTotalCents', { $divide: ['$lines.taxRate', { $add: [100, '$lines.taxRate'] }] }] }] } },
          costCents: { $sum: { $multiply: ['$lines.costPriceCents', '$lines.quantity'] } },
        },
      },
    ]);
    return { revenueCents: Math.round(row?.revenueCents ?? 0), costCents: row?.costCents ?? 0 };
  }

  const [sales, refunds] = await Promise.all([netTotals(saleMatch), netTotals(refundMatch)]);

  const revenueCents = sales.revenueCents - refunds.revenueCents;
  const costCents = sales.costCents - refunds.costCents;
  const grossProfitCents = revenueCents - costCents;

  return {
    revenueCents,
    costCents,
    grossProfitCents,
    marginPercent: revenueCents > 0 ? Math.round((grossProfitCents / revenueCents) * 1000) / 10 : 0,
  };
}

async function topDebtors(
  ledgerModel: any,
  entityModel: any,
  idField: 'supplierId' | 'customerId',
  tenantId: string,
  limit = 5,
): Promise<{ totalCents: number; top: DebtorDTO[] }> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const balances = await ledgerModel.aggregate([
    { $match: { tenantId: tenantObjectId } },
    { $group: { _id: `$${idField}`, balanceCents: { $sum: '$amountCents' } } },
    { $match: { balanceCents: { $gt: 0 } } },
    { $sort: { balanceCents: -1 } },
  ]);

  const totalCents = balances.reduce((sum: number, b: any) => sum + b.balanceCents, 0);
  const topBalances = balances.slice(0, limit);
  const entities: any[] = await entityModel
    .find({ tenantId: tenantObjectId, _id: { $in: topBalances.map((b: any) => b._id) } })
    .select('name')
    .lean();
  const nameById = new Map(entities.map((e: any) => [String(e._id), e.name as string]));

  return {
    totalCents,
    top: topBalances.map((b: any) => ({ id: String(b._id), name: nameById.get(String(b._id)) ?? 'Inconnu', balanceCents: b.balanceCents })),
  };
}

/** Dettes fournisseurs (ce qu'on doit) et clients (ce qu'on nous doit) — soldes recalculés depuis
 * les ledgers append-only, jamais depuis un champ mutable (voir SupplierLedgerEntry/CustomerLedgerEntry). */
export async function getDebtsSummary(tenantId: string): Promise<DebtsSummaryDTO> {
  const [suppliers, customers] = await Promise.all([
    topDebtors(SupplierLedgerEntry, Supplier, 'supplierId', tenantId),
    topDebtors(CustomerLedgerEntry, Customer, 'customerId', tenantId),
  ]);

  return {
    totalSupplierDebtCents: suppliers.totalCents,
    totalCustomerDebtCents: customers.totalCents,
    topSuppliers: suppliers.top,
    topCustomers: customers.top,
  };
}

/**
 * Base des déclarations G50 (réel) et G12 (IFU) : ventes moins retours, ventilées par taux de TVA et
 * par mois. `lineTotalCents` est TTC ; la TVA est extraite ligne par ligne (TTC × taux / (100 + taux))
 * — même formule que getProfitSummary — puis arrondie une seule fois par agrégat.
 */
export async function getTaxReturn(tenantId: string, filters: RangeFilters): Promise<TaxReturnDTO> {
  const base = baseMatch(tenantId, filters);
  const sign = { $cond: [{ $eq: ['$type', 'refund'] }, -1, 1] };
  const taxOf = { $divide: [{ $multiply: ['$lines.lineTotalCents', '$lines.taxRate'] }, { $add: [100, '$lines.taxRate'] }] };

  const [rateRows, monthRows, [headers], [cash]] = await Promise.all([
    Sale.aggregate([
      { $match: { ...base, status: 'completed' } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.taxRate', ttc: { $sum: { $multiply: ['$lines.lineTotalCents', sign] } }, tax: { $sum: { $multiply: [taxOf, sign] } } } },
      { $sort: { _id: -1 } },
    ]),
    Sale.aggregate([
      { $match: { ...base, status: 'completed' } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAtLocal', timezone: TIMEZONE } },
          ttc: { $sum: { $multiply: ['$lines.lineTotalCents', sign] } },
          tax: { $sum: { $multiply: [taxOf, sign] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: { ...base, status: 'completed' } },
      {
        $group: {
          _id: null,
          stamp: { $sum: { $multiply: ['$totals.stampDutyCents', sign] } },
          sales: { $sum: { $cond: [{ $eq: ['$type', 'sale'] }, 1, 0] } },
          refunds: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, 1, 0] } },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { ...base, status: 'completed' } },
      { $unwind: '$payments' },
      { $match: { 'payments.method': 'cash' } },
      { $group: { _id: null, cash: { $sum: { $multiply: ['$payments.amountCents', sign] } } } },
    ]),
  ]);

  const bucket = (ttc: number, tax: number) => ({ ttcCents: Math.round(ttc), taxCents: Math.round(tax), baseHtCents: Math.round(ttc) - Math.round(tax) });
  const byRate: TaxRateBucketDTO[] = rateRows.map((r: any) => ({ taxRate: r._id, ...bucket(r.ttc, r.tax) }));
  const byMonth: TaxMonthPointDTO[] = monthRows.map((r: any) => ({ month: r._id, ...bucket(r.ttc, r.tax) }));

  return {
    byRate,
    byMonth,
    totalHtCents: byRate.reduce((a, b) => a + b.baseHtCents, 0),
    totalTaxCents: byRate.reduce((a, b) => a + b.taxCents, 0),
    totalTtcCents: byRate.reduce((a, b) => a + b.ttcCents, 0),
    stampDutyCents: Math.round(headers?.stamp ?? 0),
    cashCents: Math.round(cash?.cash ?? 0),
    salesCount: headers?.sales ?? 0,
    refundsCount: headers?.refunds ?? 0,
  };
}
