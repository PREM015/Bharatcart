/**
 * Inventory Turnover Analysis
 * Purpose: Calculate inventory turnover ratios
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class TurnoverAnalysis {
  async calculateTurnover(productId: number, days: number = 365): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.orderItem.aggregate({
      where: {
        product_id: productId,
        order: {
          created_at: { gte: startDate },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      _sum: { quantity: true },
    });

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    const soldQuantity = sales._sum.quantity || 0;
    const avgStock = product?.stock_quantity || 1;

    return soldQuantity / avgStock;
  }

  async analyzeAll(): Promise<any[]> {
    const products = await prisma.product.findMany({
      where: { is_active: true },
    });

    return Promise.all(
      products.map(async p => ({
        productId: p.id,
        name: p.name,
        turnoverRatio: await this.calculateTurnover(p.id),
      }))
    );
  }
}

export default TurnoverAnalysis;
