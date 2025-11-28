/**
 * Dead Stock Analysis
 * Purpose: Identify slow-moving and obsolete inventory
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class DeadStockAnalysis {
  async analyze(daysThreshold: number = 90): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const products = await prisma.product.findMany({
      where: {
        stock_quantity: { gt: 0 },
      },
      include: {
        orderItems: {
          where: {
            order: {
              created_at: { gte: thresholdDate },
              status: { notIn: ['cancelled', 'refunded'] },
            },
          },
        },
      },
    });

    return products
      .filter(p => p.orderItems.length === 0)
      .map(p => ({
        productId: p.id,
        name: p.name,
        stockQuantity: p.stock_quantity,
        stockValue: (p.stock_quantity * p.price) / 100,
        daysSinceLastSale: daysThreshold,
      }));
  }
}

export default DeadStockAnalysis;
