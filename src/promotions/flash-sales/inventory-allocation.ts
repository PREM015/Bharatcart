/**
 * Flash Sale Inventory Allocation
 * Purpose: Reserve inventory for flash sales
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class InventoryAllocation {
  /**
   * Allocate inventory for flash sale
   */
  async allocate(saleId: number, productId: number, quantity: number): Promise<boolean> {
    logger.info('Allocating inventory', { saleId, productId, quantity });

    const sale = await prisma.flashSale.findUnique({
      where: { id: saleId },
    });

    if (!sale) return false;

    if (sale.max_quantity && sale.sold_quantity + quantity > sale.max_quantity) {
      logger.warn('Flash sale quantity exceeded', { saleId });
      return false;
    }

    // Reserve inventory
    await prisma.flashSale.update({
      where: { id: saleId },
      data: {
        sold_quantity: { increment: quantity },
      },
    });

    return true;
  }

  /**
   * Release allocated inventory
   */
  async release(saleId: number, quantity: number): Promise<void> {
    await prisma.flashSale.update({
      where: { id: saleId },
      data: {
        sold_quantity: { decrement: quantity },
      },
    });

    logger.info('Inventory released', { saleId, quantity });
  }

  /**
   * Get remaining quantity
   */
  async getRemaining(saleId: number): Promise<number> {
    const sale = await prisma.flashSale.findUnique({
      where: { id: saleId },
      select: { max_quantity: true, sold_quantity: true },
    });

    if (!sale || !sale.max_quantity) return Infinity;
    return Math.max(0, sale.max_quantity - sale.sold_quantity);
  }
}

export default InventoryAllocation;
