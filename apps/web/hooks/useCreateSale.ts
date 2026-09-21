'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getOfflineDB, nextLocalSaleNumber } from '../lib/db/offline-db';
import type { LocalSale, LocalStockMovement } from '../lib/db/offline-db';
import type { SaleLine, SalePayment, SaleTotals, SyncOperation } from '@pos-dz/shared';

interface CreateSaleInput {
  storeId: string;
  storeCode: string;
  registerId: string;
  cashierId: string;
  lines: SaleLine[];
  payments: SalePayment[];
  totals: SaleTotals;
}

/**
 * Écrit la vente et les mouvements de stock localement d'abord (Dexie), dans UNE transaction,
 * avant toute tentative réseau. L'UI n'attend jamais le serveur — voir docs/SYNC_STRATEGY.md.
 */
export function useCreateSale(deviceId: string) {
  const createSale = useCallback(
    async (input: CreateSaleInput): Promise<LocalSale> => {
      const db = getOfflineDB(deviceId);
      const clientGeneratedId = uuidv4();
      const number = await nextLocalSaleNumber(db, input.storeCode, input.registerId);
      const createdAtLocal = new Date().toISOString();

      const sale: LocalSale = {
        clientGeneratedId,
        number,
        storeId: input.storeId,
        registerId: input.registerId,
        cashierId: input.cashierId,
        lines: input.lines,
        payments: input.payments,
        totals: input.totals,
        createdAtLocal,
        syncStatus: 'pending',
      };

      const stockMovements: LocalStockMovement[] = input.lines.map((line) => ({
        clientGeneratedId: uuidv4(),
        productId: line.productId,
        variantSku: line.variantSku,
        storeId: input.storeId,
        type: 'sale',
        quantityDelta: -line.quantity,
        createdAtLocal,
        syncStatus: 'pending',
      }));

      await db.transaction('rw', db.sales, db.stockMovements, db.outbox, async () => {
        await db.sales.add(sale);
        await db.stockMovements.bulkAdd(stockMovements);

        const saleOp: SyncOperation = {
          clientGeneratedId,
          entityType: 'sale',
          operation: 'create',
          payload: { storeId: input.storeId, registerId: input.registerId, cashierId: input.cashierId, number, lines: input.lines, payments: input.payments, totals: input.totals },
          createdAtLocal,
          deviceId,
        };
        await db.outbox.add({ operation: saleOp });

        for (const movement of stockMovements) {
          const movementOp: SyncOperation = {
            clientGeneratedId: movement.clientGeneratedId,
            entityType: 'stockMovement',
            operation: 'create',
            payload: { productId: movement.productId, variantSku: movement.variantSku, storeId: movement.storeId, type: movement.type, quantityDelta: movement.quantityDelta, sourceDocument: { type: 'sale', id: clientGeneratedId } },
            createdAtLocal,
            deviceId,
          };
          await db.outbox.add({ operation: movementOp });
        }
      });

      return sale;
    },
    [deviceId],
  );

  return { createSale };
}
