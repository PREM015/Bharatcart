/**
 * Multi-Warehouse Management
 * Purpose: Manage inventory across multiple warehouses
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class MultiWarehouseManager {
  async getStockLevels(productId: number): Promise<any[]> {
    return await prisma.inventoryItem.findMany({
      where: { product_id: productId },
      include: { warehouse: true },
    });
  }

  async getTotalStock(productId: number): Promise<number> {
    const items = await prisma.inventoryItem.aggregate({
      where: { product_id: productId },
      _sum: { quantity_available: true },
    });

    return items._sum.quantity_available || 0;
  }
}

export default MultiWarehouseManager;
