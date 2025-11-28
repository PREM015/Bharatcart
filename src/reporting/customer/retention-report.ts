/**
 * Customer Retention Report
 * Purpose: Analyze customer retention and churn
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface RetentionReportData {
  period: string;
  cohorts: Array<{
    cohortMonth: string;
    customersAcquired: number;
    retentionRates: number[];
  }>;
  overallRetentionRate: number;
  churnRate: number;
}

export class RetentionReport {
  async generate(startDate: Date, months: number = 12): Promise<RetentionReportData> {
    logger.info('Generating retention report', { startDate, months });

    const cohorts: Array<{
      cohortMonth: string;
      customersAcquired: number;
      retentionRates: number[];
    }> = [];

    for (let i = 0; i < months; i++) {
      const cohortStart = new Date(startDate);
      cohortStart.setMonth(cohortStart.getMonth() + i);
      const cohortEnd = new Date(cohortStart);
      cohortEnd.setMonth(cohortEnd.getMonth() + 1);

      const customers = await prisma.user.findMany({
        where: {
          created_at: { gte: cohortStart, lt: cohortEnd },
          role: 'customer',
        },
      });

      const retentionRates = await this.calculateRetentionRates(
        customers.map(c => c.id),
        cohortStart,
        6
      );

      cohorts.push({
        cohortMonth: cohortStart.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        }),
        customersAcquired: customers.length,
        retentionRates,
      });
    }

    const overallRetentionRate = this.calculateOverallRetention(cohorts);
    const churnRate = 100 - overallRetentionRate;

    return {
      period: `${startDate.toLocaleDateString()} - ${months} months`,
      cohorts,
      overallRetentionRate,
      churnRate,
    };
  }

  private async calculateRetentionRates(
    customerIds: number[],
    cohortStart: Date,
    periods: number
  ): Promise<number[]> {
    const rates: number[] = [];

    for (let i = 1; i <= periods; i++) {
      const periodStart = new Date(cohortStart);
      periodStart.setMonth(periodStart.getMonth() + i);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const activeCustomers = await prisma.order.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: customerIds },
          created_at: { gte: periodStart, lt: periodEnd },
        },
      });

      const retentionRate = (activeCustomers.length / customerIds.length) * 100;
      rates.push(retentionRate);
    }

    return rates;
  }

  private calculateOverallRetention(cohorts: any[]): number {
    const allRates = cohorts.flatMap(c => c.retentionRates);
    return allRates.reduce((sum, r) => sum + r, 0) / (allRates.length || 1);
  }
}

export default RetentionReport;
