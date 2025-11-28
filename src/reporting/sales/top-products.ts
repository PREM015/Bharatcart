/**
 * Top Products Report
 * Purpose: Identify best-selling products
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface TopProductsData {
  period: string;
  topProducts: Array<{
    productId: number;
    productName: string;
    quantitySold: number;
    revenue: number;
    orderCount: number;
    avgPrice: number;
  }>;
  totalRevenue: number;
}

export class TopProducts {
  async generate(
    startDate: Date,
    endDate: Date,
    limit: number = 20
  ): Promise<TopProductsData> {
    logger.info('Generating top products report', { startDate, endDate, limit });

    const orderItems = await prisma.orderItem.groupBy({
      by: ['product_id'],
      where: {
        order: {
          created_at: { gte: startDate, lte: endDate },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      _count: { id: true },
      _sum: { quantity: true, price: true },
    });

    const productIds = orderItems.map(item => item.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map(p => [p.id, p.name]));

    const topProducts = orderItems
      .map(item => ({
        productId: item.product_id,
        productName: productMap.get(item.product_id) || 'Unknown',
        quantitySold: item._sum.quantity || 0,
        revenue: (item._sum.price || 0) / 100,
        orderCount: item._count.id,
        avgPrice: ((item._sum.price || 0) / (item._sum.quantity || 1)) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      topProducts,
      totalRevenue,
    };
  }
}

export default TopProducts;
