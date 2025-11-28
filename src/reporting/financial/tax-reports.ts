/**
 * Tax Reports
 * Purpose: Generate tax-related reports
 * Description: Sales tax, VAT, income tax calculations
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface TaxReportData {
  period: string;
  salesTax: {
    totalSales: number;
    taxableAmount: number;
    taxCollected: number;
    taxRate: number;
  };
  byState: Array<{
    state: string;
    sales: number;
    tax: number;
  }>;
  totalTaxLiability: number;
}

export class TaxReports {
  async generateSalesTaxReport(
    startDate: Date,
    endDate: Date
  ): Promise<TaxReportData> {
    logger.info('Generating sales tax report', { startDate, endDate });

    const orders = await prisma.order.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: {
        subtotal: true,
        tax_amount: true,
        shipping_address: true,
      },
    });

    const totalSales = orders.reduce((sum, o) => sum + o.subtotal, 0) / 100;
    const taxCollected = orders.reduce((sum, o) => sum + o.tax_amount, 0) / 100;

    const byState = this.groupByState(orders);

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      salesTax: {
        totalSales,
        taxableAmount: totalSales,
        taxCollected,
        taxRate: totalSales > 0 ? (taxCollected / totalSales) * 100 : 0,
      },
      byState,
      totalTaxLiability: taxCollected,
    };
  }

  private groupByState(orders: any[]) {
    const stateMap = new Map<string, { sales: number; tax: number }>();

    orders.forEach(order => {
      const address = order.shipping_address as any;
      const state = address?.state || 'Unknown';

      const existing = stateMap.get(state) || { sales: 0, tax: 0 };
      existing.sales += order.subtotal / 100;
      existing.tax += order.tax_amount / 100;
      stateMap.set(state, existing);
    });

    return Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      ...data,
    }));
  }
}

export default TaxReports;
