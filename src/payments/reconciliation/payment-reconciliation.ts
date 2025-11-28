/**
 * Payment Reconciliation
 * Purpose: Reconcile payments with gateway settlements
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class PaymentReconciliation {
  /**
   * Reconcile daily transactions
   */
  async reconcileDaily(date: Date): Promise<{
    matched: number;
    unmatched: number;
    discrepancies: any[];
  }> {
    logger.info('Reconciling payments', { date });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        created_at: { gte: startOfDay, lte: endOfDay },
      },
    });

    const discrepancies: any[] = [];
    let matched = 0;
    let unmatched = 0;

    for (const tx of transactions) {
      const isReconciled = await this.reconcileTransaction(tx);
      if (isReconciled) {
        matched++;
      } else {
        unmatched++;
        discrepancies.push({
          transactionId: tx.transaction_id,
          amount: tx.amount,
          status: tx.status,
        });
      }
    }

    return { matched, unmatched, discrepancies };
  }

  private async reconcileTransaction(transaction: any): Promise<boolean> {
    // Match with gateway settlement data
    // This would query gateway API for actual settlement
    
    const settled = transaction.status === 'captured' || transaction.status === 'success';
    
    if (settled) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { reconciled: true, reconciled_at: new Date() },
      });
    }

    return settled;
  }

  /**
   * Generate reconciliation report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalProcessed = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReconciled = transactions
      .filter(tx => tx.reconciled)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const byGateway = transactions.reduce((acc, tx) => {
      if (!acc[tx.gateway]) {
        acc[tx.gateway] = { count: 0, amount: 0 };
      }
      acc[tx.gateway].count++;
      acc[tx.gateway].amount += tx.amount;
      return acc;
    }, {} as Record<string, any>);

    return {
      period: { startDate, endDate },
      totalTransactions: transactions.length,
      totalProcessed: totalProcessed / 100,
      totalReconciled: totalReconciled / 100,
      reconciledPercentage: (totalReconciled / totalProcessed) * 100,
      byGateway,
    };
  }
}

export default PaymentReconciliation;
