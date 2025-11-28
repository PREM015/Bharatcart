/**
 * Stock Adjustment
 * Purpose: Adjust inventory for various reasons
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AdjustmentReason = 'damaged' | 'lost' | 'found' | 'cycle_count' | 'return' | 'other';

export class StockAdjustment {
  async adjust(
    productId: number,
    quantity: number,
    reason: AdjustmentReason,
    notes?: string
  ): Promise<void> {
    logger.info('Adjusting stock', { productId, quantity, reason });

    await prisma.stockAdjustment.create({
      data: {
        product_id: productId,
        quantity_change: quantity,
        reason,
        notes,
        adjusted_at: new Date(),
      },
    });

    await prisma.inventoryItem.updateMany({
      where: { product_id: productId },
      data: {
        quantity_on_hand: { increment: quantity },
        quantity_available: { increment: quantity },
      },
    });
  }

  async getAdjustmentHistory(productId: number): Promise<any[]> {
    return await prisma.stockAdjustment.findMany({
      where: { product_id: productId },
      orderBy: { adjusted_at: 'desc' },
    });
  }
}

export default StockAdjustment;
