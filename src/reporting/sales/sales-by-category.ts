/**
 * Sales by Category Report
 * Purpose: Analyze sales performance by product category
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface SalesByCategoryData {
  period: string;
  categories: Array<{
    categoryId: number;
    categoryName: string;
    orderCount: number;
    quantity: number;
    revenue: number;
    avgOrderValue: number;
    percentOfTotal: number;
  }>;
  totalRevenue: number;
}

export class SalesByCategory {
  async generate(startDate: Date, endDate: Date): Promise<SalesByCategoryData> {
    logger.info('Generating sales by category report', { startDate, endDate });

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          created_at: { gte: startDate, lte: endDate },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
        order: true,
      },
    });

    const categoryMap = new Map<number, {
      categoryName: string;
      orderCount: number;
      quantity: number;
      revenue: number;
    }>();

    orderItems.forEach(item => {
      const categoryId = item.product.category_id;
      const categoryName = item.product.category?.name || 'Uncategorized';

      const existing = categoryMap.get(categoryId) || {
        categoryName,
        orderCount: 0,
        quantity: 0,
        revenue: 0,
      };

      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;
      existing.orderCount++;

      categoryMap.set(categoryId, existing);
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );

    const categories = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      orderCount: data.orderCount,
      quantity: data.quantity,
      revenue: data.revenue / 100,
      avgOrderValue: (data.revenue / data.orderCount) / 100,
      percentOfTotal: (data.revenue / totalRevenue) * 100,
    }));

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      categories: categories.sort((a, b) => b.revenue - a.revenue),
      totalRevenue: totalRevenue / 100,
    };
  }
}

export default SalesByCategory;
