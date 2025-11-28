/**
 * Lot/Batch Tracking
 * Purpose: Track inventory by lot numbers
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class LotTracker {
  async createLot(
    productId: number,
    lotNumber: string,
    quantity: number,
    expiryDate?: Date
  ): Promise<number> {
    const lot = await prisma.inventoryLot.create({
      data: {
        product_id: productId,
        lot_number: lotNumber,
        quantity,
        expiry_date: expiryDate,
        received_date: new Date(),
      },
    });

    return lot.id;
  }

  async allocateFromLot(lotId: number, quantity: number): Promise<boolean> {
    const lot = await prisma.inventoryLot.findUnique({ where: { id: lotId } });

    if (!lot || lot.quantity < quantity) return false;

    await prisma.inventoryLot.update({
      where: { id: lotId },
      data: { quantity: { decrement: quantity } },
    });

    return true;
  }

  async getLotsForProduct(productId: number): Promise<any[]> {
    return await prisma.inventoryLot.findMany({
      where: { product_id: productId, quantity: { gt: 0 } },
      orderBy: { received_date: 'asc' }, // FIFO
    });
  }
}

export default LotTracker;
