import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Product } from '../../models/Product';
import { StockMovement } from '../../models/StockMovement';
import { SupplierLedgerEntry } from '../../models/SupplierLedgerEntry';
import { recomputeCostPrice } from '../products/products.service';
import type { StockBalanceDTO, StockMovementDTO, CreateStockMovementInput, CreatePurchaseInput } from '@pos-dz/shared';

/**
 * Le stock courant n'est jamais lu depuis un champ mutable — il est recalculé depuis le ledger
 * StockMovement à chaque appel (voir docs/DATA_MODEL.md#stockmovement). Pour une boutique à fort
 * volume, ce total peut être matérialisé dans une collection de cache recalculable ; à ce stade
 * l'agrégation directe reste largement assez rapide et évite tout risque de désynchronisation.
 */
export async function getStockBalances(tenantId: string, storeId: string): Promise<StockBalanceDTO[]> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const storeObjectId = new Types.ObjectId(storeId);

  const [products, balances] = await Promise.all([
    Product.find({ tenantId: tenantObjectId, active: true }).lean(),
    StockMovement.aggregate([
      { $match: { tenantId: tenantObjectId, storeId: storeObjectId } },
      { $group: { _id: '$productId', quantity: { $sum: '$quantityDelta' } } },
    ]),
  ]);

  const quantityByProduct = new Map(balances.map((b) => [String(b._id), b.quantity as number]));

  return products.map((p) => ({
    productId: String(p._id),
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    isPerishable: p.isPerishable,
    lowStockThreshold: p.lowStockThreshold,
    quantity: quantityByProduct.get(String(p._id)) ?? 0,
  }));
}

export async function getMovementHistory(tenantId: string, storeId: string, productId: string): Promise<StockMovementDTO[]> {
  const docs = await StockMovement.find({
    tenantId: new Types.ObjectId(tenantId),
    storeId: new Types.ObjectId(storeId),
    productId: new Types.ObjectId(productId),
  })
    .sort({ createdAtLocal: -1 })
    .limit(100)
    .lean();

  return docs.map((m) => ({
    id: String(m._id),
    productId: String(m.productId),
    variantSku: m.variantSku,
    storeId: String(m.storeId),
    type: m.type,
    quantityDelta: m.quantityDelta,
    unitCostCents: m.unitCostCents,
    lotNumber: m.lotNumber,
    expiryDate: m.expiryDate?.toISOString(),
    note: m.note,
    createdAtLocal: m.createdAtLocal.toISOString(),
  }));
}

async function getProductStockQuantity(tenantId: string, storeId: string, productId: string): Promise<number> {
  const [balance] = await StockMovement.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        storeId: new Types.ObjectId(storeId),
        productId: new Types.ObjectId(productId),
      },
    },
    { $group: { _id: null, quantity: { $sum: '$quantityDelta' } } },
  ]);
  return balance?.quantity ?? 0;
}

/**
 * Réception fournisseur : crée le mouvement de stock, met à jour le coût moyen pondéré du produit,
 * et — si la réception n'est pas payée intégralement — enregistre la dette sur le fournisseur
 * choisi (ledger append-only, voir docs/DATA_MODEL.md et SupplierLedgerEntry).
 */
export async function createPurchase(tenantId: string, input: CreatePurchaseInput): Promise<StockMovementDTO> {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const quantity = Math.abs(input.quantity);
  const totalCostCents = quantity * input.unitCostCents;
  const paidCents = Math.min(Math.max(0, input.paidCents), totalCostCents);

  const currentQty = await getProductStockQuantity(tenantId, input.storeId, input.productId);

  const now = new Date();
  const doc = await StockMovement.create({
    tenantId: tenantObjectId,
    storeId: new Types.ObjectId(input.storeId),
    productId: new Types.ObjectId(input.productId),
    variantSku: input.variantSku,
    type: 'purchase' as const,
    quantityDelta: quantity,
    unitCostCents: input.unitCostCents,
    supplierId: input.supplierId ? new Types.ObjectId(input.supplierId) : undefined,
    lotNumber: input.lotNumber,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
    note: input.note,
    clientGeneratedId: randomUUID(),
    createdAtLocal: now,
  });

  await recomputeCostPrice(tenantId, input.productId, currentQty, quantity, input.unitCostCents);

  const unpaidCents = totalCostCents - paidCents;
  if (input.supplierId && unpaidCents > 0) {
    await SupplierLedgerEntry.create({
      tenantId: tenantObjectId,
      supplierId: new Types.ObjectId(input.supplierId),
      type: 'purchase_on_credit' as const,
      amountCents: unpaidCents,
      reference: { type: 'purchase' as const, id: doc._id },
      note: input.note,
      clientGeneratedId: randomUUID(),
      createdAtLocal: now,
    });
  }

  return {
    id: String(doc._id),
    productId: String(doc.productId),
    variantSku: doc.variantSku,
    storeId: String(doc.storeId),
    type: doc.type,
    quantityDelta: doc.quantityDelta,
    unitCostCents: doc.unitCostCents,
    lotNumber: doc.lotNumber,
    expiryDate: doc.expiryDate?.toISOString(),
    note: doc.note,
    createdAtLocal: doc.createdAtLocal.toISOString(),
  };
}

/**
 * Mouvement saisi directement en back-office (correction d'inventaire, casse — voir createPurchase
 * pour les réceptions fournisseur) — toujours en ligne, donc le clientGeneratedId est généré côté
 * serveur. Même table que les mouvements remontés par la caisse hors-ligne : c'est le même ledger,
 * une seule source de vérité.
 */
export async function createManualMovement(tenantId: string, input: CreateStockMovementInput): Promise<StockMovementDTO> {
  const doc = await StockMovement.create({
    tenantId: new Types.ObjectId(tenantId),
    storeId: new Types.ObjectId(input.storeId),
    productId: new Types.ObjectId(input.productId),
    variantSku: input.variantSku,
    type: input.type,
    quantityDelta: input.quantityDelta,
    lotNumber: input.lotNumber,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
    note: input.note,
    clientGeneratedId: randomUUID(),
    createdAtLocal: new Date(),
  });

  return {
    id: String(doc._id),
    productId: String(doc.productId),
    variantSku: doc.variantSku,
    storeId: String(doc.storeId),
    type: doc.type,
    quantityDelta: doc.quantityDelta,
    unitCostCents: doc.unitCostCents,
    lotNumber: doc.lotNumber,
    expiryDate: doc.expiryDate?.toISOString(),
    note: doc.note,
    createdAtLocal: doc.createdAtLocal.toISOString(),
  };
}
