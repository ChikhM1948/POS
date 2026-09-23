import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Sale } from '../../models/Sale';
import { StockMovement } from '../../models/StockMovement';
import { User } from '../../models/User';
import type { SaleListItemDTO, SaleDetailDTO, CreateRefundInput, SaleLine, SaleTotals } from '@pos-dz/shared';

export class RefundValidationError extends Error {}

export interface ListSalesFilters {
  storeId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

function buildMatch(tenantId: string, filters: Pick<ListSalesFilters, 'storeId' | 'from' | 'to' | 'search'>) {
  const match: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (filters.storeId) match.storeId = new Types.ObjectId(filters.storeId);
  if (filters.from || filters.to) {
    match.createdAtLocal = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }
  if (filters.search) match.number = new RegExp(filters.search.trim(), 'i');
  return match;
}

/**
 * Résout les noms de caissiers via une requête User séparée, explicitement filtrée par tenantId
 * — jamais via `.populate()`, dont la requête interne sur User ne passe PAS par le filtre de la
 * requête parente et se fait donc rejeter par tenantScopePlugin (qui exige tenantId sur toute
 * requête User). Voir apps/api/src/models/plugins/tenantScope.ts.
 */
async function resolveCashierNames(tenantId: string, cashierIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(cashierIds.map(String))].map((id) => new Types.ObjectId(id));
  if (uniqueIds.length === 0) return new Map();

  const users = await User.find({ tenantId: new Types.ObjectId(tenantId), _id: { $in: uniqueIds } })
    .select('name')
    .lean();
  return new Map(users.map((u) => [String(u._id), u.name]));
}

function toListItem(s: any, cashierName: string): SaleListItemDTO {
  return {
    id: String(s._id),
    number: s.number,
    type: s.type,
    storeId: String(s.storeId),
    cashierName,
    createdAtLocal: s.createdAtLocal.toISOString(),
    grandTotalCents: s.totals.grandTotalCents,
    paymentMethods: s.payments.map((p: any) => p.method),
    status: s.status,
  };
}

const lineKey = (productId: unknown, variantSku?: string) => `${String(productId)}::${variantSku ?? ''}`;

export async function listSales(tenantId: string, filters: ListSalesFilters): Promise<{ sales: SaleListItemDTO[]; total: number }> {
  const match = buildMatch(tenantId, filters);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  const [docs, total] = await Promise.all([
    Sale.find(match).sort({ createdAtLocal: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Sale.countDocuments(match),
  ]);

  const cashierNames = await resolveCashierNames(tenantId, docs.map((s) => s.cashierId));
  const sales = docs.map((s) => toListItem(s, cashierNames.get(String(s.cashierId)) ?? 'Inconnu'));

  return { sales, total };
}

export async function getSaleById(tenantId: string, saleId: string): Promise<SaleDetailDTO | null> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const s = await Sale.findOne({ tenantId: tenantObjectId, _id: saleId }).lean();
  if (!s) return null;

  const relatedIds = [s.cashierId];
  let refundDocs: any[] = [];
  if (s.type === 'sale') {
    refundDocs = await Sale.find({ tenantId: tenantObjectId, refundOf: s._id, type: 'refund' }).sort({ createdAtLocal: -1 }).lean();
    relatedIds.push(...refundDocs.map((r) => r.cashierId));
  }
  const cashierNames = await resolveCashierNames(tenantId, relatedIds);

  const detail: SaleDetailDTO = {
    ...toListItem(s, cashierNames.get(String(s.cashierId)) ?? 'Inconnu'),
    lines: s.lines,
    payments: s.payments,
    totals: s.totals,
  };

  if (s.type === 'refund' && s.refundOf) {
    detail.refundOf = String(s.refundOf);
  }

  if (s.type === 'sale') {
    const refundedByKey = new Map<string, number>();
    for (const refund of refundDocs) {
      for (const line of refund.lines) {
        const key = lineKey(line.productId, line.variantSku);
        refundedByKey.set(key, (refundedByKey.get(key) ?? 0) + line.quantity);
      }
    }
    detail.refundedQuantities = s.lines.map((l) => refundedByKey.get(lineKey(l.productId, l.variantSku)) ?? 0);
    detail.refunds = refundDocs.map((r) => toListItem(r, cashierNames.get(String(r.cashierId)) ?? 'Inconnu'));
  }

  return detail;
}

/**
 * Crée un retour partiel ou total, lié à la vente d'origine (immuable — jamais modifiée), avec
 * remise en stock optionnelle. Même principe d'idempotence que le reste du ledger : clientGeneratedId
 * généré côté serveur puisque cette action est toujours en ligne (back-office).
 */
export async function createRefund(
  tenantId: string,
  originalSaleId: string,
  actorUserId: string,
  input: CreateRefundInput,
): Promise<SaleDetailDTO> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const original = await Sale.findOne({ tenantId: tenantObjectId, _id: originalSaleId });
  if (!original) throw new RefundValidationError('Vente introuvable.');
  if (original.type !== 'sale') throw new RefundValidationError("Seule une vente d'origine peut faire l'objet d'un retour.");
  if (original.status !== 'completed') throw new RefundValidationError("Cette vente n'est pas dans un état permettant un retour.");
  if (!input.lines || input.lines.length === 0) throw new RefundValidationError('Sélectionnez au moins une ligne à retourner.');

  const priorRefunds = await Sale.find({ tenantId: tenantObjectId, refundOf: original._id, type: 'refund' }).lean();
  const alreadyRefunded = new Map<string, number>();
  for (const refund of priorRefunds) {
    for (const line of refund.lines) {
      const key = lineKey(line.productId, line.variantSku);
      alreadyRefunded.set(key, (alreadyRefunded.get(key) ?? 0) + line.quantity);
    }
  }

  const refundLines: SaleLine[] = [];
  for (const requested of input.lines) {
    if (requested.quantity <= 0) throw new RefundValidationError('La quantité à retourner doit être positive.');

    const originalLine = original.lines.find(
      (l) => String(l.productId) === requested.productId && (l.variantSku ?? undefined) === (requested.variantSku ?? undefined),
    );
    if (!originalLine) throw new RefundValidationError('Une des lignes sélectionnées ne fait pas partie de cette vente.');

    const key = lineKey(originalLine.productId, originalLine.variantSku);
    const remaining = originalLine.quantity - (alreadyRefunded.get(key) ?? 0);
    if (requested.quantity > remaining) {
      throw new RefundValidationError(`Quantité demandée pour "${originalLine.name.fr}" supérieure à la quantité restant à retourner (${remaining}).`);
    }

    // Le prix unitaire net (après remise) est dérivé du total de la ligne d'origine, pour rester
    // fidèle à ce qui a réellement été payé plutôt qu'au prix catalogue.
    const netUnitCents = Math.round(originalLine.lineTotalCents / originalLine.quantity);
    const lineTotalCents = netUnitCents * requested.quantity;

    refundLines.push({
      productId: requested.productId,
      variantSku: requested.variantSku,
      name: originalLine.name,
      quantity: requested.quantity,
      unitPriceCents: originalLine.unitPriceCents,
      costPriceCents: originalLine.costPriceCents,
      taxRate: originalLine.taxRate,
      discountCents: 0,
      lineTotalCents,
    });
  }

  const grandTotalCents = refundLines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const taxTotalCents = refundLines.reduce((sum, l) => sum + Math.round((l.lineTotalCents * l.taxRate) / (100 + l.taxRate)), 0);
  const totals: SaleTotals = {
    subtotalCents: grandTotalCents - taxTotalCents,
    taxTotalCents,
    stampDutyCents: 0,
    discountTotalCents: 0,
    grandTotalCents,
  };

  const now = new Date();
  const refund = await Sale.create({
    tenantId: tenantObjectId,
    storeId: original.storeId,
    registerId: 'BACKOFFICE',
    cashierId: new Types.ObjectId(actorUserId),
    number: `${original.number}-RET${priorRefunds.length + 1}`,
    type: 'refund',
    refundOf: original._id,
    lines: refundLines,
    payments: [{ method: input.paymentMethod, amountCents: grandTotalCents }],
    totals,
    status: 'completed',
    clientGeneratedId: randomUUID(),
    createdAtLocal: now,
    syncedAt: now,
  });

  if (input.restock) {
    await StockMovement.insertMany(
      refundLines.map((l) => ({
        tenantId: tenantObjectId,
        storeId: original.storeId,
        productId: new Types.ObjectId(l.productId),
        variantSku: l.variantSku,
        type: 'refund' as const,
        quantityDelta: l.quantity,
        note: input.note || 'Retour client',
        sourceDocument: { type: 'sale' as const, id: refund._id },
        clientGeneratedId: randomUUID(),
        createdAtLocal: now,
      })),
    );
  }

  const detail = await getSaleById(tenantId, String(refund._id));
  return detail!;
}
