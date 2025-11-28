/**
 * Overstock Alerts
 * Purpose: Alert for excess inventory
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class OverstockAlerter {
  async checkOverstock(): Promise<any[]> {
    const products = await prisma.product.findMany({
      where: {
        stock_quantity: { gte: 100 }, // Threshold
        is_active: true,
      },
    });

    const overstocked = products.filter(p => {
      const maxStock = (p.reorder_level || 0) * 3;
      return p.stock_quantity > maxStock;
    });

    for (const product of overstocked) {
      await this.sendAlert(product);
    }

    return overstocked;
  }

  private async sendAlert(product: any): Promise<void> {
    logger.warn('Overstock alert', {
      productId: product.id,
      stock: product.stock_quantity,
    });
  }
}

export default OverstockAlerter;
