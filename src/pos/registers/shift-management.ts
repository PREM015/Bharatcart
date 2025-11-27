/**
 * Shift Management System
 * Purpose: Manage cashier shifts
 * Description: Open/close shifts, track activities, shift reports
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TillOperations, TillFloat } from '../cash-management/till-operations';
import { CashReconciliation } from '../cash-management/cash-reconciliation';

export interface Shift {
  id: number;
  register_id: number;
  user_id: number;
  status: 'active' | 'closed' | 'suspended';
  started_at: Date;
  ended_at?: Date;
  starting_float: number;
  expected_cash: number;
  actual_cash?: number;
  cash_difference?: number;
  total_sales: number;
  total_refunds: number;
  total_transactions: number;
}

export interface ShiftReport {
  shift: Shift;
  transactions: {
    total: number;
    sales: number;
    refunds: number;
    voids: number;
  };
  payments: {
    cash: number;
    card: number;
    other: number;
  };
  cash_movements: {
    drops: number;
    pay_ins: number;
    pay_outs: number;
  };
  discrepancy: number;
  requires_review: boolean;
}

export class ShiftManagement {
  private registerId: number;
  private drawerId: number;
  private tillOps: TillOperations;
  private reconciliation: CashReconciliation;

  constructor(registerId: number, drawerId: number) {
    this.registerId = registerId;
    this.drawerId = drawerId;
    this.tillOps = new TillOperations(registerId, drawerId);
    this.reconciliation = new CashReconciliation();
  }

  /**
   * Open new shift
   */
  async openShift(
    userId: number,
    startingFloat: TillFloat
  ): Promise<Shift> {
    logger.info('Opening shift', {
      register_id: this.registerId,
      user_id: userId,
    });

    // Check if shift already active
    const activeShift = await this.getActiveShift();
    if (activeShift) {
      throw new Error('Shift already active on this register');
    }

    // Open till
    const shiftId = await this.tillOps.openTill(userId, startingFloat);

    // Update register
    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        current_shift_id: shiftId,
        current_user_id: userId,
        status: 'ACTIVE',
      },
    });

    // Get created shift
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new Error('Failed to create shift');
    }

    logger.info('Shift opened', {
      shift_id: shiftId,
      float: startingFloat.total,
    });

    return this.mapShift(shift);
  }

  /**
   * Close shift
   */
  async closeShift(
    userId: number,
    finalCount: any
  ): Promise<ShiftReport> {
    logger.info('Closing shift', {
      register_id: this.registerId,
      user_id: userId,
    });

    const activeShift = await this.getActiveShift();
    if (!activeShift) {
      throw new Error('No active shift to close');
    }

    // Close till and get reconciliation
    const tillResult = await this.tillOps.closeTill(userId, finalCount);

    // Perform reconciliation
    const reconciliationResult = await this.reconciliation.reconcileShift(
      activeShift.id
    );

    // Update register
    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        current_shift_id: null,
        current_user_id: null,
        status: 'INACTIVE',
      },
    });

    // Generate shift report
    const report = await this.generateShiftReport(activeShift.id);

    logger.info('Shift closed', {
      shift_id: activeShift.id,
      difference: tillResult.difference,
    });

    return report;
  }

  /**
   * Suspend shift (break)
   */
  async suspendShift(userId: number, reason: string): Promise<void> {
    logger.info('Suspending shift', {
      register_id: this.registerId,
      user_id: userId,
      reason,
    });

    const activeShift = await this.getActiveShift();
    if (!activeShift) {
      throw new Error('No active shift to suspend');
    }

    await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        status: 'SUSPENDED',
        suspended_at: new Date(),
        suspension_reason: reason,
      },
    });

    await prisma.register.update({
      where: { id: this.registerId },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Resume shift
   */
  async resumeShift(userId: number): Promise<void> {
    logger.info('Resuming shift', {
      register_id: this.registerId,
      user_id: userId,
    });

    const shift = await prisma.shift.findFirst({
      where: {
        register_id: this.registerId,
        status: 'SUSPENDED',
      },
    });

    if (!shift) {
      throw new Error('No suspended shift to resume');
    }

    await prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: 'ACTIVE',
        resumed_at: new Date(),
      },
    });

    await prisma.register.update({
      where: { id: this.registerId },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Get active shift
   */
  async getActiveShift(): Promise<Shift | null> {
    const shift = await prisma.shift.findFirst({
      where: {
        register_id: this.registerId,
        status: 'ACTIVE',
      },
    });

    return shift ? this.mapShift(shift) : null;
  }

  /**
   * Get shift by ID
   */
  async getShift(shiftId: number): Promise<Shift | null> {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    return shift ? this.mapShift(shift) : null;
  }

  /**
   * Generate shift report
   */
  async generateShiftReport(shiftId: number): Promise<ShiftReport> {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        transactions: true,
        cashDrops: true,
        payInOuts: true,
      },
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Count transactions
    const sales = shift.transactions.filter(t => t.type === 'SALE');
    const refunds = shift.transactions.filter(t => t.type === 'REFUND');
    const voids = shift.transactions.filter(t => t.type === 'VOID');

    // Calculate payment totals
    const cashPayments = shift.transactions
      .filter(t => t.payment_method === 'CASH')
      .reduce((sum, t) => sum + t.total, 0);

    const cardPayments = shift.transactions
      .filter(t => t.payment_method === 'CARD')
      .reduce((sum, t) => sum + t.total, 0);

    const otherPayments = shift.transactions
      .filter(t => t.payment_method !== 'CASH' && t.payment_method !== 'CARD')
      .reduce((sum, t) => sum + t.total, 0);

    // Calculate cash movements
    const totalDrops = shift.cashDrops.reduce((sum, d) => sum + d.amount, 0);
    const totalPayIns = shift.payInOuts
      .filter(p => p.type === 'PAY_IN')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPayOuts = shift.payInOuts
      .filter(p => p.type === 'PAY_OUT')
      .reduce((sum, p) => sum + p.amount, 0);

    const discrepancy = shift.cash_difference || 0;

    return {
      shift: this.mapShift(shift),
      transactions: {
        total: shift.transactions.length,
        sales: sales.length,
        refunds: refunds.length,
        voids: voids.length,
      },
      payments: {
        cash: cashPayments / 100,
        card: cardPayments / 100,
        other: otherPayments / 100,
      },
      cash_movements: {
        drops: totalDrops / 100,
        pay_ins: totalPayIns / 100,
        pay_outs: totalPayOuts / 100,
      },
      discrepancy: discrepancy / 100,
      requires_review: Math.abs(discrepancy / 100) > 5,
    };
  }

  /**
   * Get shift history
   */
  async getShiftHistory(
    filters?: {
      user_id?: number;
      start_date?: Date;
      end_date?: Date;
      status?: string;
    },
    limit: number = 50
  ): Promise<Shift[]> {
    const where: any = {
      register_id: this.registerId,
    };

    if (filters) {
      if (filters.user_id) where.user_id = filters.user_id;
      if (filters.status) where.status = filters.status.toUpperCase();
      if (filters.start_date || filters.end_date) {
        where.started_at = {};
        if (filters.start_date) where.started_at.gte = filters.start_date;
        if (filters.end_date) where.started_at.lte = filters.end_date;
      }
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { started_at: 'desc' },
      take: limit,
    });

    return shifts.map(this.mapShift);
  }

  /**
   * Get shift statistics
   */
  async getShiftStats(shiftId: number): Promise<any> {
    const transactions = await prisma.transaction.findMany({
      where: { shift_id: shiftId },
    });

    const totalSales = transactions
      .filter(t => t.type === 'SALE')
      .reduce((sum, t) => sum + t.total, 0);

    const avgTransaction = transactions.length > 0 
      ? totalSales / transactions.length 
      : 0;

    const hourlyBreakdown = this.calculateHourlyBreakdown(transactions);

    return {
      total_transactions: transactions.length,
      total_sales: totalSales / 100,
      average_transaction: avgTransaction / 100,
      hourly_breakdown: hourlyBreakdown,
    };
  }

  /**
   * Calculate hourly breakdown
   */
  private calculateHourlyBreakdown(transactions: any[]): any[] {
    const breakdown: Record<number, { hour: number; transactions: number; sales: number }> = {};

    transactions.forEach(tx => {
      const hour = new Date(tx.created_at).getHours();
      
      if (!breakdown[hour]) {
        breakdown[hour] = { hour, transactions: 0, sales: 0 };
      }

      breakdown[hour].transactions++;
      if (tx.type === 'SALE') {
        breakdown[hour].sales += tx.total;
      }
    });

    return Object.values(breakdown).map(b => ({
      ...b,
      sales: b.sales / 100,
    }));
  }

  /**
   * Map database shift to interface
   */
  private mapShift(shift: any): Shift {
    return {
      id: shift.id,
      register_id: shift.register_id,
      user_id: shift.user_id,
      status: shift.status.toLowerCase(),
      started_at: shift.started_at,
      ended_at: shift.ended_at,
      starting_float: shift.starting_float / 100,
      expected_cash: shift.expected_cash / 100,
      actual_cash: shift.actual_cash ? shift.actual_cash / 100 : undefined,
      cash_difference: shift.cash_difference ? shift.cash_difference / 100 : undefined,
      total_sales: shift.total_sales / 100,
      total_refunds: shift.total_refunds / 100,
      total_transactions: shift.total_transactions,
    };
  }

  /**
   * Export shift report to PDF
   */
  async exportShiftReport(shiftId: number): Promise<Buffer> {
    const report = await this.generateShiftReport(shiftId);

    // Generate PDF using PDF library
    // This is a placeholder - implement with actual PDF generation
    const pdfData = Buffer.from(JSON.stringify(report, null, 2));

    return pdfData;
  }

  /**
   * Validate shift closure
   */
  async validateClosure(shiftId: number): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        transactions: true,
      },
    });

    if (!shift) {
      return { valid: false, issues: ['Shift not found'] };
    }

    // Check for pending transactions
    const pendingTx = shift.transactions.filter(
      t => t.status === 'PENDING'
    );

    if (pendingTx.length > 0) {
      issues.push(`${pendingTx.length} pending transactions`);
    }

    // Check cash discrepancy
    if (shift.cash_difference && Math.abs(shift.cash_difference / 100) > 20) {
      issues.push('Large cash discrepancy detected');
    }

    // Check shift duration
    const duration = shift.ended_at 
      ? shift.ended_at.getTime() - shift.started_at.getTime()
      : Date.now() - shift.started_at.getTime();

    if (duration > 12 * 60 * 60 * 1000) {
      issues.push('Shift duration exceeds 12 hours');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export default ShiftManagement;
