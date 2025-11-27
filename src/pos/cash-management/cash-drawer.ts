/**
 * Cash Drawer Management
 * Purpose: Control physical cash drawer operations
 * Description: Open/close drawer, track cash levels, security controls
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface CashDrawer {
  id: number;
  register_id: number;
  status: 'closed' | 'open' | 'locked';
  current_cash: number;
  expected_cash: number;
  last_opened_at?: Date;
  opened_by?: number;
}

export interface DrawerCount {
  bills: {
    hundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    two: number;
    one: number;
  };
  coins: {
    dollar: number;
    quarter: number;
    dime: number;
    nickel: number;
    penny: number;
  };
  total: number;
}

export class CashDrawerController extends EventEmitter {
  private drawerId: number;
  private isOpen: boolean = false;

  constructor(drawerId: number) {
    super();
    this.drawerId = drawerId;
  }

  /**
   * Open cash drawer
   */
  async open(
    userId: number,
    reason: 'sale' | 'return' | 'till_count' | 'manual' = 'manual'
  ): Promise<void> {
    logger.info('Opening cash drawer', {
      drawer_id: this.drawerId,
      user_id: userId,
      reason,
    });

    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: this.drawerId },
    });

    if (!drawer) {
      throw new Error('Cash drawer not found');
    }

    if (drawer.status === 'locked') {
      throw new Error('Cash drawer is locked - manager authorization required');
    }

    // Send command to hardware
    await this.sendOpenCommand();

    // Log drawer opening
    await prisma.drawerEvent.create({
      data: {
        drawer_id: this.drawerId,
        event_type: 'OPENED',
        reason,
        user_id: userId,
        created_at: new Date(),
      },
    });

    // Update drawer status
    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        status: 'OPEN',
        last_opened_at: new Date(),
        opened_by: userId,
      },
    });

    this.isOpen = true;
    this.emit('opened', { drawerId: this.drawerId, reason });
  }

  /**
   * Close cash drawer
   */
  async close(): Promise<void> {
    logger.info('Closing cash drawer', { drawer_id: this.drawerId });

    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        status: 'CLOSED',
        last_closed_at: new Date(),
      },
    });

    this.isOpen = false;
    this.emit('closed', { drawerId: this.drawerId });
  }

  /**
   * Lock cash drawer (requires manager)
   */
  async lock(managerId: number, reason: string): Promise<void> {
    logger.warn('Locking cash drawer', {
      drawer_id: this.drawerId,
      manager_id: managerId,
      reason,
    });

    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        status: 'LOCKED',
        locked_by: managerId,
        lock_reason: reason,
        locked_at: new Date(),
      },
    });

    this.emit('locked', { drawerId: this.drawerId, reason });
  }

  /**
   * Unlock cash drawer
   */
  async unlock(managerId: number): Promise<void> {
    logger.info('Unlocking cash drawer', {
      drawer_id: this.drawerId,
      manager_id: managerId,
    });

    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        status: 'CLOSED',
        locked_by: null,
        lock_reason: null,
        unlocked_by: managerId,
        unlocked_at: new Date(),
      },
    });

    this.emit('unlocked', { drawerId: this.drawerId });
  }

  /**
   * Count cash in drawer
   */
  async countCash(count: DrawerCount, countedBy: number): Promise<void> {
    logger.info('Counting cash in drawer', {
      drawer_id: this.drawerId,
      total: count.total,
    });

    // Save count record
    await prisma.drawerCount.create({
      data: {
        drawer_id: this.drawerId,
        counted_by: countedBy,
        bills: JSON.stringify(count.bills),
        coins: JSON.stringify(count.coins),
        total_counted: Math.round(count.total * 100),
        counted_at: new Date(),
      },
    });

    // Update drawer cash level
    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        current_cash: Math.round(count.total * 100),
        last_counted_at: new Date(),
      },
    });

    // Check for discrepancies
    await this.checkDiscrepancy(count.total);
  }

  /**
   * Add cash to drawer
   */
  async addCash(
    amount: number,
    reason: string,
    addedBy: number,
    reference?: string
  ): Promise<void> {
    logger.info('Adding cash to drawer', {
      drawer_id: this.drawerId,
      amount,
      reason,
    });

    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: this.drawerId },
    });

    if (!drawer) {
      throw new Error('Drawer not found');
    }

    const newTotal = drawer.current_cash + Math.round(amount * 100);

    await prisma.cashTransaction.create({
      data: {
        drawer_id: this.drawerId,
        type: 'CASH_IN',
        amount: Math.round(amount * 100),
        reason,
        reference,
        user_id: addedBy,
        created_at: new Date(),
      },
    });

    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        current_cash: newTotal,
        expected_cash: drawer.expected_cash + Math.round(amount * 100),
      },
    });

    this.emit('cash_added', { drawerId: this.drawerId, amount });
  }

  /**
   * Remove cash from drawer
   */
  async removeCash(
    amount: number,
    reason: string,
    removedBy: number,
    reference?: string
  ): Promise<void> {
    logger.info('Removing cash from drawer', {
      drawer_id: this.drawerId,
      amount,
      reason,
    });

    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: this.drawerId },
    });

    if (!drawer) {
      throw new Error('Drawer not found');
    }

    const newTotal = drawer.current_cash - Math.round(amount * 100);

    if (newTotal < 0) {
      throw new Error('Insufficient cash in drawer');
    }

    await prisma.cashTransaction.create({
      data: {
        drawer_id: this.drawerId,
        type: 'CASH_OUT',
        amount: Math.round(amount * 100),
        reason,
        reference,
        user_id: removedBy,
        created_at: new Date(),
      },
    });

    await prisma.cashDrawer.update({
      where: { id: this.drawerId },
      data: {
        current_cash: newTotal,
        expected_cash: drawer.expected_cash - Math.round(amount * 100),
      },
    });

    this.emit('cash_removed', { drawerId: this.drawerId, amount });
  }

  /**
   * Get drawer status
   */
  async getStatus(): Promise<CashDrawer> {
    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: this.drawerId },
    });

    if (!drawer) {
      throw new Error('Drawer not found');
    }

    return {
      id: drawer.id,
      register_id: drawer.register_id,
      status: drawer.status as 'closed' | 'open' | 'locked',
      current_cash: drawer.current_cash / 100,
      expected_cash: drawer.expected_cash / 100,
      last_opened_at: drawer.last_opened_at,
      opened_by: drawer.opened_by,
    };
  }

  /**
   * Check for cash discrepancies
   */
  private async checkDiscrepancy(countedAmount: number): Promise<void> {
    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: this.drawerId },
    });

    if (!drawer) return;

    const expected = drawer.expected_cash / 100;
    const difference = Math.abs(countedAmount - expected);

    // Alert if discrepancy over $5
    if (difference > 5) {
      logger.warn('Cash discrepancy detected', {
        drawer_id: this.drawerId,
        expected,
        counted: countedAmount,
        difference,
      });

      await prisma.drawerAlert.create({
        data: {
          drawer_id: this.drawerId,
          alert_type: 'DISCREPANCY',
          severity: difference > 20 ? 'HIGH' : 'MEDIUM',
          message: `Cash discrepancy of $${difference.toFixed(2)}`,
          expected_amount: Math.round(expected * 100),
          actual_amount: Math.round(countedAmount * 100),
          created_at: new Date(),
        },
      });

      this.emit('discrepancy', {
        drawerId: this.drawerId,
        expected,
        counted: countedAmount,
        difference,
      });
    }
  }

  /**
   * Send hardware command to open drawer
   */
  private async sendOpenCommand(): Promise<void> {
    // ESC/POS command to open cash drawer
    // This would integrate with actual hardware
    const openCommand = 'p ú';
    
    // In real implementation, send to printer/drawer controller
    logger.debug('Sending drawer open command', { drawer_id: this.drawerId });
  }

  /**
   * Get drawer transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<any[]> {
    return await prisma.cashTransaction.findMany({
      where: { drawer_id: this.drawerId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}

export default CashDrawerController;
