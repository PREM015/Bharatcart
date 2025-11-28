/**
 * Customer Acquisition Report
 * Purpose: Track new customer acquisition metrics
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AcquisitionReportData {
  period: string;
  newCustomers: number;
  acquisitionBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  firstPurchaseStats: {
    avgOrderValue: number;
    avgItemsPerOrder: number;
    totalRevenue: number;
  };
}

export class AcquisitionReport {
  async generate(startDate: Date, endDate: Date): Promise<AcquisitionReportData> {
    logger.info('Generating customer acquisition report', { startDate, endDate });

    const newCustomers = await prisma.user.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        role: 'customer',
      },
      include: {
        orders: {
          orderBy: { created_at: 'asc' },
          take: 1,
        },
      },
    });

    const firstOrders = newCustomers
      .map(c => c.orders[0])
      .filter(o => o);

    const avgOrderValue = firstOrders.reduce((sum, o) => sum + o.total, 0) /
      (firstOrders.length || 1) / 100;

    const totalRevenue = firstOrders.reduce((sum, o) => sum + o.total, 0) / 100;

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      newCustomers: newCustomers.length,
      acquisitionBySource: this.groupBySource(newCustomers),
      firstPurchaseStats: {
        avgOrderValue,
        avgItemsPerOrder: 0, // Would calculate from order items
        totalRevenue,
      },
    };
  }

  private groupBySource(customers: any[]) {
    // Would track actual acquisition sources
    return [
      { source: 'Organic', count: customers.length, percentage: 100 },
    ];
  }
}

export default AcquisitionReport;
