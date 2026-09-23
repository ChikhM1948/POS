import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Sale } from '../../models/Sale';
import { StockMovement } from '../../models/StockMovement';
import { SyncQueue } from '../../models/SyncQueue';
import { CustomerLedgerEntry } from '../../models/CustomerLedgerEntry';
import type { SyncOperation, SyncPushResult } from '@pos-dz/shared';

/**
 * Une vente à crédit (payments[].method === 'credit') matérialise la dette du client concerné —
 * voir docs/ARCHITECTURE.md#5 ("Karna") et CustomerLedgerEntry.ts. Appelé uniquement dans la
 * branche déjà protégée par la vérification d'idempotence SyncQueue ci-dessous : ce bloc ne
 * s'exécute donc qu'une seule fois par vente, même si la synchro est rejouée.
 */
async function recordCreditFromSale(tenantId: string, saleId: string, payload: any, createdAtLocal: string) {
  const creditPayments = (payload.payments ?? []).filter((p: any) => p.method === 'credit' && p.customerId && p.amountCents > 0);
  if (creditPayments.length === 0) return;

  await CustomerLedgerEntry.insertMany(
    creditPayments.map((p: any) => ({
      tenantId: new Types.ObjectId(tenantId),
      customerId: new Types.ObjectId(p.customerId),
      type: 'sale_credit' as const,
      amountCents: p.amountCents,
      reference: { type: 'sale' as const, id: new Types.ObjectId(saleId) },
      clientGeneratedId: randomUUID(),
      createdAtLocal: new Date(createdAtLocal),
    })),
  );
}

/**
 * Applique une opération de manière idempotente : le upsert par (tenantId, clientGeneratedId)
 * garantit que rejouer la même opération (retry réseau, double appel) ne crée jamais de doublon.
 */
export async function applyOperation(
  tenantId: string,
  deviceId: string,
  op: SyncOperation,
): Promise<SyncPushResult> {
  const tenantObjectId = new Types.ObjectId(tenantId);

  try {
    const existingLog = await SyncQueue.findOne({
      tenantId: tenantObjectId,
      clientGeneratedId: op.clientGeneratedId,
    });
    if (existingLog?.status === 'applied') {
      return { clientGeneratedId: op.clientGeneratedId, status: 'already_applied' };
    }

    let serverId: string;

    if (op.entityType === 'sale') {
      // includeResultMetadata expose lastErrorObject.updatedExisting : nécessaire pour ne créer
      // les écritures de crédit client (recordCreditFromSale) qu'une seule fois par vente, même
      // si deux appels concurrents rejouent le même clientGeneratedId (retry réseau).
      const result = await Sale.findOneAndUpdate(
        { tenantId: tenantObjectId, clientGeneratedId: op.clientGeneratedId },
        { $setOnInsert: { tenantId: tenantObjectId, ...(op.payload as object), createdAtLocal: op.createdAtLocal, clientGeneratedId: op.clientGeneratedId, syncedAt: new Date() } },
        { upsert: true, new: true, includeResultMetadata: true },
      );
      const doc = result.value;
      serverId = String(doc!._id);
      if (!result.lastErrorObject?.updatedExisting) {
        await recordCreditFromSale(tenantId, serverId, op.payload as any, op.createdAtLocal);
      }
    } else if (op.entityType === 'stockMovement') {
      const doc = await StockMovement.findOneAndUpdate(
        { tenantId: tenantObjectId, clientGeneratedId: op.clientGeneratedId },
        { $setOnInsert: { tenantId: tenantObjectId, ...(op.payload as object), createdAtLocal: op.createdAtLocal, clientGeneratedId: op.clientGeneratedId } },
        { upsert: true, new: true },
      );
      serverId = String(doc!._id);
    } else {
      throw new Error(`Type d'entité inconnu: ${op.entityType}`);
    }

    await SyncQueue.findOneAndUpdate(
      { tenantId: tenantObjectId, clientGeneratedId: op.clientGeneratedId },
      {
        $setOnInsert: { tenantId: tenantObjectId, deviceId, entityType: op.entityType, clientGeneratedId: op.clientGeneratedId, receivedAt: new Date() },
        $set: { status: 'applied', appliedAt: new Date() },
      },
      { upsert: true },
    );

    return { clientGeneratedId: op.clientGeneratedId, status: 'applied', serverId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    await SyncQueue.findOneAndUpdate(
      { tenantId: tenantObjectId, clientGeneratedId: op.clientGeneratedId },
      {
        $setOnInsert: { tenantId: tenantObjectId, deviceId, entityType: op.entityType, clientGeneratedId: op.clientGeneratedId, receivedAt: new Date() },
        $set: { status: 'rejected', error: message },
      },
      { upsert: true },
    );
    return { clientGeneratedId: op.clientGeneratedId, status: 'rejected', error: message };
  }
}

export async function pullChangesSince(tenantId: string, since: Date) {
  // Le pull ne renvoie que le référentiel consolidé (catalogue, stock, clients actifs — pour la
  // sélection client d'une vente à crédit hors-ligne), jamais les ventes d'autres caisses —
  // voir docs/SYNC_STRATEGY.md#ordre-dapplication-au-pull.
  const tenantObjectId = new Types.ObjectId(tenantId);
  const { Product } = await import('../../models/Product');
  const { Customer } = await import('../../models/Customer');

  const [updatedProducts, updatedCustomers] = await Promise.all([
    Product.find({ tenantId: tenantObjectId, updatedAt: { $gt: since } }).lean(),
    Customer.find({ tenantId: tenantObjectId, active: true, updatedAt: { $gt: since } }).lean(),
  ]);

  return {
    products: updatedProducts,
    customers: updatedCustomers,
    serverTime: new Date().toISOString(),
  };
}
