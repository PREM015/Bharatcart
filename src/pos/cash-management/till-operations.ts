/**
 * Till Operations Management
 * Purpose: Handle cash register till operations
 * Description: Opening float, cash drops, till balancing
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { CashDrawerController, DrawerCount } from './cash-drawer';

export interface TillFloat {
  bills: {
    twenty: number;
    ten: number;
    five: number;
    one: number;
  };
  coins: {
    quarter: number;
    dime: number;
    nickel: number;
    penny: number;
  };
  total: number;
}

export interface CashDrop {
  amount: number;
  denomination_breakdown: DrawerCount;
  dropped_by: number;
  reason: string;
  safe_location: string;
}

export class TillOperations {
  private registerId: number;
  private drawerController: CashDrawerController;

  constructor(registerId: number, drawerId: number) {
    this.registerId = registerId;
    this.drawerController = new CashDrawerController(drawerId);
  }

  /**
   * Open till with starting float
   */
  async openTill(
    userId: number,
    startingFloat: TillFloat
  ): Promise<number> {
    logger.info('Opening till', {
      register_id: this.registerId,
      user_id: userId,
      float_amount: startingFloat.total,
    });

    // Check if till already open
    const existingShift = await prisma.shift.findFirst({
      where: {
        register_id: this.registerId,
        status: 'ACTIVE',
      },
    });

    if (existingShift) {
      throw new Error('Till already open for this register');
    }

    // Create new shift
    const shift = await prisma.shift.create({
      data: {
        register_id: this.registerId,
        user_id: userId,
        status: 'ACTIVE',
        started_at: new Date(),
        starting_float: Math.round(startingFloat.total * 100),
        expected_cash: Math.round(startingFloat.total * 100),
        actual_cash: Math.round(startingFloat.total * 100),
      },
    });

    // Log float details
    await prisma.floatLog.create({
      data: {
        shift_id: shift.id,
        type: 'OPENING',
        amount: Math.round(startingFloat.total * 100),
        bills: JSON.stringify(startingFloat.bills),
        coins: JSON.stringify(startingFloat.coins),
        created_at: new Date(),
      },
    });

    // Add float to drawer
    await this.drawerController.addCash(
      startingFloat.total,
      'Opening float',
      userId,
      `SHIFT-${shift.id}`
    );

    logger.info('Till opened successfully', {
      shift_id: shift.id,
      float: startingFloat.total,
    });

    return shift.id;
  }

  /**
   * Perform cash drop (remove excess cash)
   */
  async performCashDrop(drop: CashDrop): Promise<number> {
    logger.info('Performing cash drop', {
      register_id: this.registerId,
      amount: drop.amount,
    });

    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      throw new Error('No active shift for cash drop');
    }

    // Create cash drop record
    const cashDrop = await prisma.cashDrop.create({
      data: {
        shift_id: activeShift.id,
        register_id: this.registerId,
        amount: Math.round(drop.amount * 100),
        denomination_breakdown: JSON.stringify(drop.denomination_breakdown),
        dropped_by: drop.dropped_by,
        reason: drop.reason,
        safe_location: drop.safe_location,
        dropped_at: new Date(),
        status: 'PENDING_VERIFICATION',
      },
    });

    // Remove cash from drawer
    await this.drawerController.removeCash(
      drop.amount,
      'Cash drop',
      drop.dropped_by,
      `DROP-${cashDrop.id}`
    );

    // Update shift expected cash
    await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        expected_cash: {
          decrement: Math.round(drop.amount * 100),
        },
      },
    });

    logger.info('Cash drop completed', {
      drop_id: cashDrop.id,
      amount: drop.amount,
    });

    return cashDrop.id;
  }

  /**
   * Verify cash drop in safe
   */
  async verifyCashDrop(
    dropId: number,
    verifiedBy: number,
    actualAmount: number,
    notes?: string
  ): Promise<void> {
    logger.info('Verifying cash drop', {
      drop_id: dropId,
      verified_by: verifiedBy,
    });

    const drop = await prisma.cashDrop.findUnique({
      where: { id: dropId },
    });

    if (!drop) {
      throw new Error('Cash drop not found');
    }

    const expectedAmount = drop.amount / 100;
    const discrepancy = Math.abs(actualAmount - expectedAmount);

    await prisma.cashDrop.update({
      where: { id: dropId },
      data: {
        status: discrepancy > 0.01 ? 'DISCREPANCY' : 'VERIFIED',
        verified_by: verifiedBy,
        verified_at: new Date(),
        actual_amount: Math.round(actualAmount * 100),
        verification_notes: notes,
      },
    });

    if (discrepancy > 0.01) {
      logger.warn('Cash drop discrepancy detected', {
        drop_id: dropId,
        expected: expectedAmount,
        actual: actualAmount,
        difference: discrepancy,
      });
    }
  }

  /**
   * Perform no-sale (open drawer without transaction)
   */
  async performNoSale(userId: number, reason: string): Promise<void> {
    logger.info('Performing no-sale', {
      register_id: this.registerId,
      user_id: userId,
      reason,
    });

    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      throw new Error('No active shift');
    }

    // Log no-sale event
    await prisma.noSaleEvent.create({
      data: {
        shift_id: activeShift.id,
        register_id: this.registerId,
        user_id: userId,
        reason,
        created_at: new Date(),
      },
    });

    // Open drawer
    await this.drawerController.open(userId, 'manual');

    // Auto-close after 5 seconds
    setTimeout(async () => {
      await this.drawerController.close();
    }, 5000);
  }

  /**
   * Pay in (add cash for specific reason)
   */
  async payIn(
    amount: number,
    reason: string,
    userId: number,
    reference?: string
  ): Promise<void> {
    logger.info('Processing pay-in', {
      register_id: this.registerId,
      amount,
      reason,
    });

    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      throw new Error('No active shift');
    }

    // Log pay-in
    await prisma.payInOut.create({
      data: {
        shift_id: activeShift.id,
        type: 'PAY_IN',
        amount: Math.round(amount * 100),
        reason,
        reference,
        user_id: userId,
        created_at: new Date(),
      },
    });

    // Add to drawer
    await this.drawerController.addCash(amount, reason, userId, reference);

    // Update shift expected cash
    await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        expected_cash: {
          increment: Math.round(amount * 100),
        },
      },
    });
  }

  /**
   * Pay out (remove cash for specific reason)
   */
  async payOut(
    amount: number,
    reason: string,
    userId: number,
    requiresApproval: boolean = true,
    approvedBy?: number
  ): Promise<void> {
    logger.info('Processing pay-out', {
      register_id: this.registerId,
      amount,
      reason,
    });

    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      throw new Error('No active shift');
    }

    if (requiresApproval && !approvedBy) {
      throw new Error('Manager approval required for pay-out');
    }

    // Log pay-out
    await prisma.payInOut.create({
      data: {
        shift_id: activeShift.id,
        type: 'PAY_OUT',
        amount: Math.round(amount * 100),
        reason,
        user_id: userId,
        approved_by: approvedBy,
        created_at: new Date(),
      },
    });

    // Remove from drawer
    await this.drawerController.removeCash(amount, reason, userId);

    // Update shift expected cash
    await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        expected_cash: {
          decrement: Math.round(amount * 100),
        },
      },
    });
  }

  /**
   * Close till and balance
   */
  async closeTill(
    userId: number,
    finalCount: DrawerCount
  ): Promise<{
    shift_id: number;
    expected: number;
    counted: number;
    difference: number;
    requires_review: boolean;
  }> {
    logger.info('Closing till', {
      register_id: this.registerId,
      user_id: userId,
    });

    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      throw new Error('No active shift to close');
    }

    // Count cash
    await this.drawerController.countCash(finalCount, userId);

    // Get shift totals
    const shiftSummary = await this.calculateShiftTotals(activeShift.id);

    const expected = shiftSummary.expected_cash / 100;
    const counted = finalCount.total;
    const difference = counted - expected;

    // Update shift
    await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        status: 'CLOSED',
        ended_at: new Date(),
        actual_cash: Math.round(counted * 100),
        cash_difference: Math.round(difference * 100),
        requires_review: Math.abs(difference) > 5,
        closed_by: userId,
        ...shiftSummary,
      },
    });

    // Log closing float
    await prisma.floatLog.create({
      data: {
        shift_id: activeShift.id,
        type: 'CLOSING',
        amount: Math.round(counted * 100),
        bills: JSON.stringify(finalCount.bills),
        coins: JSON.stringify(finalCount.coins),
        created_at: new Date(),
      },
    });

    logger.info('Till closed', {
      shift_id: activeShift.id,
      difference,
      requires_review: Math.abs(difference) > 5,
    });

    return {
      shift_id: activeShift.id,
      expected,
      counted,
      difference,
      requires_review: Math.abs(difference) > 5,
    };
  }

  /**
   * Get active shift
   */
  private async getActiveShift(): Promise<any> {
    return await prisma.shift.findFirst({
      where: {
        register_id: this.registerId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Calculate shift totals
   */
  private async calculateShiftTotals(shiftId: number): Promise<any> {
    const transactions = await prisma.transaction.findMany({
      where: { shift_id: shiftId },
    });

    const total_sales = transactions
      .filter(t => t.type === 'SALE')
      .reduce((sum, t) => sum + t.total, 0);

    const total_refunds = transactions
      .filter(t => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.total, 0);

    const cash_sales = transactions
      .filter(t => t.type === 'SALE' && t.payment_method === 'CASH')
      .reduce((sum, t) => sum + t.total, 0);

    const card_sales = transactions
      .filter(t => t.type === 'SALE' && t.payment_method === 'CARD')
      .reduce((sum, t) => sum + t.total, 0);

    return {
      total_sales,
      total_refunds,
      total_transactions: transactions.length,
      cash_sales,
      card_sales,
      net_sales: total_sales - total_refunds,
    };
  }

  /**
   * Get till summary
   */
  async getTillSummary(): Promise<any> {
    const activeShift = await this.getActiveShift();

    if (!activeShift) {
      return null;
    }

    const summary = await this.calculateShiftTotals(activeShift.id);
    const drawerStatus = await this.drawerController.getStatus();

    return {
      shift_id: activeShift.id,
      started_at: activeShift.started_at,
      starting_float: activeShift.starting_float / 100,
      current_cash: drawerStatus.current_cash,
      expected_cash: drawerStatus.expected_cash,
      ...summary,
    };
  }
}

export default TillOperations;
