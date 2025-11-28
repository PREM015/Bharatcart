/**
 * Cycle Counting
 * Purpose: Regular inventory counts without full shutdown
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class CycleCounter {
  async createCount(warehouseId: number, productIds: number[]): Promise<number> {
    const count = await prisma.cycleCount.create({
      data: {
        warehouse_id: warehouseId,
        product_ids: JSON.stringify(productIds),
        status: 'scheduled',
        scheduled_date: new Date(),
      },
    });

    return count.id;
  }

  async recordCount(
    countId: number,
    productId: number,
    countedQuantity: number
  ): Promise<void> {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { product_id: productId },
    });

    if (!inventoryItem) return;

    const variance = countedQuantity - inventoryItem.quantity_on_hand;

    await prisma.cycleCountResult.create({
      data: {
        cycle_count_id: countId,
        product_id: productId,
        expected_quantity: inventoryItem.quantity_on_hand,
        counted_quantity: countedQuantity,
        variance,
        counted_at: new Date(),
      },
    });

    // Adjust inventory if variance exists
    if (variance !== 0) {
      await this.adjustInventory(productId, variance);
    }
  }

  private async adjustInventory(productId: number, adjustment: number): Promise<void> {
    await prisma.inventoryItem.updateMany({
      where: { product_id: productId },
      data: {
        quantity_on_hand: { increment: adjustment },
        quantity_available: { increment: adjustment },
      },
    });
  }
}

export default CycleCounter;
