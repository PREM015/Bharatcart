/**
 * Low Stock Alerts
 * Purpose: Alert when inventory falls below threshold
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class LowStockAlerter {
  async checkLowStock(): Promise<any[]> {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock_quantity: { lte: prisma.raw('reorder_level') },
        is_active: true,
      },
    });

    for (const product of lowStockProducts) {
      await this.sendAlert(product);
    }

    return lowStockProducts;
  }

  private async sendAlert(product: any): Promise<void> {
    logger.warn('Low stock alert', {
      productId: product.id,
      stock: product.stock_quantity,
      reorderLevel: product.reorder_level,
    });

    await prisma.inventoryAlert.create({
      data: {
        product_id: product.id,
        alert_type: 'low_stock',
        message: `${product.name} is low on stock (${product.stock_quantity} remaining)`,
        created_at: new Date(),
      },
    });
  }
}

export default LowStockAlerter;
