/**
 * Customer Lifetime Value Report
 * Purpose: Calculate customer lifetime value (CLV)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface LifetimeValueData {
  averageCLV: number;
  medianCLV: number;
  topCustomers: Array<{
    customerId: number;
    customerName: string;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    firstPurchase: Date;
    lastPurchase: Date;
    lifetimeDays: number;
  }>;
  clvBySegment: Array<{
    segment: string;
    customerCount: number;
    avgCLV: number;
  }>;
}

export class LifetimeValue {
  async generate(limit: number = 100): Promise<LifetimeValueData> {
    logger.info('Generating lifetime value report', { limit });

    const customers = await prisma.user.findMany({
      where: { role: 'customer' },
      include: {
        orders: {
          where: { status: { notIn: ['cancelled', 'refunded'] } },
          select: {
            total: true,
            created_at: true,
          },
        },
      },
    });

    const customerData = customers
      .map(customer => {
        if (customer.orders.length === 0) return null;

        const totalRevenue = customer.orders.reduce((sum, o) => sum + o.total, 0) / 100;
        const firstPurchase = customer.orders[0].created_at;
        const lastPurchase = customer.orders[customer.orders.length - 1].created_at;
        const lifetimeDays = Math.floor(
          (lastPurchase.getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          customerId: customer.id,
          customerName: customer.name || 'Unknown',
          totalOrders: customer.orders.length,
          totalRevenue,
          avgOrderValue: totalRevenue / customer.orders.length,
          firstPurchase,
          lastPurchase,
          lifetimeDays,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const clvValues = customerData.map(c => c.totalRevenue);
    const averageCLV = clvValues.reduce((sum, v) => sum + v, 0) / (clvValues.length || 1);
    const medianCLV = this.calculateMedian(clvValues);

    return {
      averageCLV,
      medianCLV,
      topCustomers: customerData.slice(0, limit),
      clvBySegment: this.segmentCustomers(customerData),
    };
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private segmentCustomers(customers: any[]) {
    const segments = [
      { name: 'High Value', min: 1000, max: Infinity },
      { name: 'Medium Value', min: 500, max: 999.99 },
      { name: 'Low Value', min: 0, max: 499.99 },
    ];

    return segments.map(segment => {
      const segmentCustomers = customers.filter(
        c => c.totalRevenue >= segment.min && c.totalRevenue <= segment.max
      );

      return {
        segment: segment.name,
        customerCount: segmentCustomers.length,
        avgCLV: segmentCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) /
          (segmentCustomers.length || 1),
      };
    });
  }
}

export default LifetimeValue;
