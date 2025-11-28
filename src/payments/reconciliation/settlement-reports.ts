/**
 * Settlement Reports
 * Purpose: Generate settlement reports for accounting
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class SettlementReports {
  async generateDailyReport(date: Date): Promise<any> {
    logger.info('Generating settlement report', { date });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [payments, refunds, fees] = await Promise.all([
      this.getPayments(startOfDay, endOfDay),
      this.getRefunds(startOfDay, endOfDay),
      this.getFees(startOfDay, endOfDay),
    ]);

    const grossSales = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const netSettlement = grossSales - totalRefunds - totalFees;

    return {
      date,
      grossSales: grossSales / 100,
      totalRefunds: totalRefunds / 100,
      totalFees: totalFees / 100,
      netSettlement: netSettlement / 100,
      paymentCount: payments.length,
      refundCount: refunds.length,
      breakdown: {
        payments,
        refunds,
        fees,
      },
    };
  }

  private async getPayments(startDate: Date, endDate: Date): Promise<any[]> {
    return await prisma.paymentTransaction.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { in: ['captured', 'success'] },
      },
    });
  }

  private async getRefunds(startDate: Date, endDate: Date): Promise<any[]> {
    return await prisma.paymentTransaction.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: 'refunded',
      },
    });
  }

  private async getFees(startDate: Date, endDate: Date): Promise<any[]> {
    // Calculate processing fees
    const payments = await this.getPayments(startDate, endDate);
    
    return payments.map(p => ({
      transactionId: p.transaction_id,
      amount: Math.round(p.amount * 0.029 + 30), // 2.9% + $0.30
    }));
  }

  async exportToCSV(report: any): Promise<string> {
    let csv = 'Date,Transaction ID,Type,Amount,Fee,Net
';

    for (const payment of report.breakdown.payments) {
      csv += `${report.date},${payment.transaction_id},Payment,${payment.amount / 100},0,${payment.amount / 100}
`;
    }

    for (const refund of report.breakdown.refunds) {
      csv += `${report.date},${refund.transaction_id},Refund,-${refund.amount / 100},0,-${refund.amount / 100}
`;
    }

    return csv;
  }
}

export default SettlementReports;
