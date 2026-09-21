import { Types } from 'mongoose';
import { Sale } from '../../models/Sale';
import { StockMovement } from '../../models/StockMovement';
import { SyncQueue } from '../../models/SyncQueue';
import type { SyncOperation, SyncPushResult } from '@pos-dz/shared';

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
      const doc = await Sale.findOneAndUpdate(
        { tenantId: tenantObjectId, clientGeneratedId: op.clientGeneratedId },
        { $setOnInsert: { tenantId: tenantObjectId, ...(op.payload as object), createdAtLocal: op.createdAtLocal, clientGeneratedId: op.clientGeneratedId, syncedAt: new Date() } },
        { upsert: true, new: true },
      );
      serverId = String(doc!._id);
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
  // Le pull ne renvoie que le référentiel consolidé (catalogue, stock), jamais les ventes
  // d'autres caisses — voir docs/SYNC_STRATEGY.md#ordre-dapplication-au-pull.
  const tenantObjectId = new Types.ObjectId(tenantId);
  const { Product } = await import('../../models/Product');

  const [updatedProducts] = await Promise.all([
    Product.find({ tenantId: tenantObjectId, updatedAt: { $gt: since } }).lean(),
  ]);

  return {
    products: updatedProducts,
    serverTime: new Date().toISOString(),
  };
}
