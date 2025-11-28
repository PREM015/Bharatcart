/**
 * Business Metrics Calculator
 * Purpose: Calculate key business KPIs
 */

import { prisma } from '@/lib/prisma';

export class BusinessMetrics {
  async calculateLTV(userId: number): Promise<number> {
    const orders = await prisma.order.aggregate({
      where: {
        user_id: userId,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _sum: { total: true },
    });

    return (orders._sum.total || 0) / 100;
  }

  async calculateCAC(startDate: Date, endDate: Date): Promise<number> {
    const marketingSpend = 10000; // Would come from marketing data
    const newCustomers = await prisma.user.count({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
    });

    return newCustomers > 0 ? marketingSpend / newCustomers : 0;
  }

  async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    const activeStart = await this.getActiveUsers(startDate);
    const activeEnd = await this.getActiveUsers(endDate);

    return activeStart > 0 ? ((activeStart - activeEnd) / activeStart) * 100 : 0;
  }

  private async getActiveUsers(date: Date): Promise<number> {
    const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);

    return await prisma.user.count({
      where: {
        last_login: { gte: thirtyDaysAgo, lte: date },
      },
    });
  }

  async calculateAOV(startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.order.aggregate({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _avg: { total: true },
    });

    return (result._avg.total || 0) / 100;
  }
}

export default BusinessMetrics;
