/**
 * Cash Reconciliation System
 * Purpose: Reconcile cash at end of day/shift
 * Description: Variance analysis, audit trails, reporting
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { generatePDF } from '@/lib/pdf';

export interface ReconciliationReport {
  shift_id: number;
  register_id: number;
  date: Date;
  starting_float: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  variance_percentage: number;
  breakdown: {
    cash_sales: number;
    cash_refunds: number;
    cash_drops: number;
    pay_ins: number;
    pay_outs: number;
  };
  requires_action: boolean;
}

export class CashReconciliation {
  /**
   * Perform shift reconciliation
   */
  async reconcileShift(shiftId: number): Promise<ReconciliationReport> {
    logger.info('Reconciling shift', { shift_id: shiftId });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        register: true,
        transactions: true,
        cashDrops: true,
        payInOuts: true,
      },
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Calculate expected cash
    const cashSales = shift.transactions
      .filter(t => t.type === 'SALE' && t.payment_method === 'CASH')
      .reduce((sum, t) => sum + t.total, 0);

    const cashRefunds = shift.transactions
      .filter(t => t.type === 'REFUND' && t.payment_method === 'CASH')
      .reduce((sum, t) => sum + t.total, 0);

    const cashDrops = shift.cashDrops
      .reduce((sum, d) => sum + d.amount, 0);

    const payIns = shift.payInOuts
      .filter(p => p.type === 'PAY_IN')
      .reduce((sum, p) => sum + p.amount, 0);

    const payOuts = shift.payInOuts
      .filter(p => p.type === 'PAY_OUT')
      .reduce((sum, p) => sum + p.amount, 0);

    const expectedCash = 
      shift.starting_float +
      cashSales -
      cashRefunds -
      cashDrops +
      payIns -
      payOuts;

    const actualCash = shift.actual_cash;
    const variance = actualCash - expectedCash;
    const variancePercentage = (variance / expectedCash) * 100;

    // Create reconciliation record
    const reconciliation = await prisma.reconciliation.create({
      data: {
        shift_id: shiftId,
        register_id: shift.register_id,
        date: new Date(),
        starting_float: shift.starting_float,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance: Math.round(variance),
        variance_percentage: variancePercentage,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_drops: cashDrops,
        pay_ins: payIns,
        pay_outs: payOuts,
        status: this.getReconciliationStatus(variance),
        reconciled_at: new Date(),
      },
    });

    // Check if action required
    const requiresAction = Math.abs(variance / 100) > 10; // $10 threshold

    if (requiresAction) {
      await this.flagForReview(reconciliation.id, variance / 100);
    }

    logger.info('Shift reconciled', {
      reconciliation_id: reconciliation.id,
      variance: variance / 100,
    });

    return {
      shift_id: shiftId,
      register_id: shift.register_id,
      date: new Date(),
      starting_float: shift.starting_float / 100,
      expected_cash: expectedCash / 100,
      actual_cash: actualCash / 100,
      variance: variance / 100,
      variance_percentage: variancePercentage,
      breakdown: {
        cash_sales: cashSales / 100,
        cash_refunds: cashRefunds / 100,
        cash_drops: cashDrops / 100,
        pay_ins: payIns / 100,
        pay_outs: payOuts / 100,
      },
      requires_action: requiresAction,
    };
  }

  /**
   * Perform end-of-day reconciliation
   */
  async reconcileEndOfDay(date: Date): Promise<any> {
    logger.info('Performing end-of-day reconciliation', { date });

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // Get all shifts for the day
    const shifts = await prisma.shift.findMany({
      where: {
        started_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'CLOSED',
      },
      include: {
        reconciliation: true,
      },
    });

    // Aggregate totals
    const totalExpected = shifts.reduce(
      (sum, s) => sum + (s.reconciliation?.expected_cash || 0),
      0
    );

    const totalActual = shifts.reduce(
      (sum, s) => sum + (s.reconciliation?.actual_cash || 0),
      0
    );

    const totalVariance = totalActual - totalExpected;

    // Get all cash drops for the day
    const cashDrops = await prisma.cashDrop.findMany({
      where: {
        dropped_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'VERIFIED',
      },
    });

    const totalDrops = cashDrops.reduce((sum, d) => sum + d.amount, 0);

    // Create daily reconciliation
    const dailyRec = await prisma.dailyReconciliation.create({
      data: {
        date: startOfDay,
        total_shifts: shifts.length,
        total_expected_cash: totalExpected,
        total_actual_cash: totalActual,
        total_variance: Math.round(totalVariance),
        total_cash_drops: totalDrops,
        total_deposits: totalActual - totalDrops,
        status: this.getDailyStatus(totalVariance / 100),
        reconciled_at: new Date(),
      },
    });

    logger.info('End-of-day reconciliation completed', {
      daily_rec_id: dailyRec.id,
      total_variance: totalVariance / 100,
    });

    return {
      date: startOfDay,
      total_shifts: shifts.length,
      total_expected: totalExpected / 100,
      total_actual: totalActual / 100,
      total_variance: totalVariance / 100,
      total_drops: totalDrops / 100,
      status: dailyRec.status,
    };
  }

  /**
   * Generate reconciliation report
   */
  async generateReport(
    reconciliationId: number,
    format: 'pdf' | 'json' = 'pdf'
  ): Promise<Buffer | object> {
    const reconciliation = await prisma.reconciliation.findUnique({
      where: { id: reconciliationId },
      include: {
        shift: {
          include: {
            register: true,
            user: true,
            transactions: true,
            cashDrops: true,
          },
        },
      },
    });

    if (!reconciliation) {
      throw new Error('Reconciliation not found');
    }

    const reportData = {
      reconciliation_id: reconciliation.id,
      shift_id: reconciliation.shift_id,
      register: reconciliation.shift.register.name,
      operator: reconciliation.shift.user.name,
      date: reconciliation.date,
      shift_start: reconciliation.shift.started_at,
      shift_end: reconciliation.shift.ended_at,
      starting_float: reconciliation.starting_float / 100,
      cash_sales: reconciliation.cash_sales / 100,
      cash_refunds: reconciliation.cash_refunds / 100,
      cash_drops: reconciliation.cash_drops / 100,
      pay_ins: reconciliation.pay_ins / 100,
      pay_outs: reconciliation.pay_outs / 100,
      expected_cash: reconciliation.expected_cash / 100,
      actual_cash: reconciliation.actual_cash / 100,
      variance: reconciliation.variance / 100,
      variance_percentage: reconciliation.variance_percentage,
      status: reconciliation.status,
    };

    if (format === 'json') {
      return reportData;
    }

    // Generate PDF
    return await generatePDF('reconciliation_report', reportData);
  }

  /**
   * Get variance analysis
   */
  async getVarianceAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const reconciliations = await prisma.reconciliation.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        shift: {
          include: {
            register: true,
            user: true,
          },
        },
      },
    });

    // Group by register
    const byRegister = reconciliations.reduce((acc: any, rec) => {
      const registerId = rec.register_id;
      if (!acc[registerId]) {
        acc[registerId] = {
          register_name: rec.shift.register.name,
          total_shifts: 0,
          total_variance: 0,
          overages: 0,
          shortages: 0,
        };
      }

      acc[registerId].total_shifts++;
      acc[registerId].total_variance += rec.variance;

      if (rec.variance > 0) {
        acc[registerId].overages += rec.variance;
      } else {
        acc[registerId].shortages += Math.abs(rec.variance);
      }

      return acc;
    }, {});

    // Group by user
    const byUser = reconciliations.reduce((acc: any, rec) => {
      const userId = rec.shift.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_name: rec.shift.user.name,
          total_shifts: 0,
          total_variance: 0,
          average_variance: 0,
        };
      }

      acc[userId].total_shifts++;
      acc[userId].total_variance += rec.variance;

      return acc;
    }, {});

    // Calculate averages
    Object.values(byUser).forEach((user: any) => {
      user.average_variance = user.total_variance / user.total_shifts / 100;
      user.total_variance = user.total_variance / 100;
    });

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      total_shifts: reconciliations.length,
      by_register: Object.values(byRegister).map((r: any) => ({
        ...r,
        total_variance: r.total_variance / 100,
        overages: r.overages / 100,
        shortages: r.shortages / 100,
      })),
      by_user: Object.values(byUser),
    };
  }

  /**
   * Flag reconciliation for review
   */
  private async flagForReview(
    reconciliationId: number,
    variance: number
  ): Promise<void> {
    await prisma.reconciliationAlert.create({
      data: {
        reconciliation_id: reconciliationId,
        alert_type: variance > 0 ? 'OVERAGE' : 'SHORTAGE',
        amount: Math.round(Math.abs(variance) * 100),
        severity: Math.abs(variance) > 50 ? 'HIGH' : 'MEDIUM',
        status: 'PENDING',
        created_at: new Date(),
      },
    });

    logger.warn('Reconciliation flagged for review', {
      reconciliation_id: reconciliationId,
      variance,
    });
  }

  /**
   * Get reconciliation status
   */
  private getReconciliationStatus(variance: number): string {
    const amount = Math.abs(variance / 100);

    if (amount <= 1) return 'BALANCED';
    if (amount <= 5) return 'MINOR_VARIANCE';
    if (amount <= 20) return 'SIGNIFICANT_VARIANCE';
    return 'MAJOR_VARIANCE';
  }

  /**
   * Get daily status
   */
  private getDailyStatus(variance: number): string {
    const amount = Math.abs(variance);

    if (amount <= 5) return 'BALANCED';
    if (amount <= 25) return 'ACCEPTABLE';
    return 'REQUIRES_REVIEW';
  }
}

export default CashReconciliation;
