/**
 * Sales by Region Report
 * Purpose: Analyze sales performance by geographic region
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface SalesByRegionData {
  period: string;
  regions: Array<{
    region: string;
    orderCount: number;
    revenue: number;
    avgOrderValue: number;
    percentOfTotal: number;
  }>;
  totalRevenue: number;
}

export class SalesByRegion {
  async generate(startDate: Date, endDate: Date): Promise<SalesByRegionData> {
    logger.info('Generating sales by region report', { startDate, endDate });

    const orders = await prisma.order.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: {
        total: true,
        shipping_address: true,
      },
    });

    const regionMap = new Map<string, { orderCount: number; revenue: number }>();

    orders.forEach(order => {
      const address = order.shipping_address as any;
      const region = address?.state || 'Unknown';

      const existing = regionMap.get(region) || { orderCount: 0, revenue: 0 };
      existing.orderCount++;
      existing.revenue += order.total;

      regionMap.set(region, existing);
    });

    const totalRevenue = Array.from(regionMap.values()).reduce(
      (sum, r) => sum + r.revenue,
      0
    );

    const regions = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      orderCount: data.orderCount,
      revenue: data.revenue / 100,
      avgOrderValue: (data.revenue / data.orderCount) / 100,
      percentOfTotal: (data.revenue / totalRevenue) * 100,
    }));

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      regions: regions.sort((a, b) => b.revenue - a.revenue),
      totalRevenue: totalRevenue / 100,
    };
  }
}

export default SalesByRegion;
