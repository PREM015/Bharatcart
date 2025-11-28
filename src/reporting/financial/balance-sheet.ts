/**
 * Balance Sheet Report
 * Purpose: Generate balance sheet (assets, liabilities, equity)
 * Description: Snapshot of financial position
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface BalanceSheetData {
  asOfDate: Date;
  assets: {
    current: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      total: number;
    };
    fixed: {
      equipment: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      accountsPayable: number;
      shortTermDebt: number;
      total: number;
    };
    longTerm: {
      longTermDebt: number;
      total: number;
    };
    total: number;
  };
  equity: {
    retainedEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
}

export class BalanceSheet {
  async generate(asOfDate: Date): Promise<BalanceSheetData> {
    logger.info('Generating balance sheet', { asOfDate });

    const [cash, inventory, receivables] = await Promise.all([
      this.calculateCash(asOfDate),
      this.calculateInventoryValue(asOfDate),
      this.calculateReceivables(asOfDate),
    ]);

    const currentAssets = {
      cash,
      accountsReceivable: receivables,
      inventory,
      total: cash + receivables + inventory,
    };

    const fixedAssets = {
      equipment: 0, // Would come from asset tracking
      total: 0,
    };

    const assets = {
      current: currentAssets,
      fixed: fixedAssets,
      total: currentAssets.total + fixedAssets.total,
    };

    const payables = await this.calculatePayables(asOfDate);
    const currentLiabilities = {
      accountsPayable: payables,
      shortTermDebt: 0,
      total: payables,
    };

    const longTermLiabilities = {
      longTermDebt: 0,
      total: 0,
    };

    const liabilities = {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: currentLiabilities.total + longTermLiabilities.total,
    };

    const retainedEarnings = assets.total - liabilities.total;
    const equity = {
      retainedEarnings,
      total: retainedEarnings,
    };

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity: liabilities.total + equity.total,
    };
  }

  private async calculateCash(asOfDate: Date): Promise<number> {
    // Calculate cash from completed orders
    const completedOrders = await prisma.order.aggregate({
      where: {
        created_at: { lte: asOfDate },
        status: 'delivered',
      },
      _sum: { total: true },
    });

    return (completedOrders._sum.total || 0) / 100;
  }

  private async calculateInventoryValue(asOfDate: Date): Promise<number> {
    const inventory = await prisma.product.findMany({
      where: { created_at: { lte: asOfDate } },
      select: {
        stock_quantity: true,
        cost_price: true,
      },
    });

    const value = inventory.reduce((sum, item) => {
      return sum + (item.stock_quantity * (item.cost_price || 0));
    }, 0);

    return value / 100;
  }

  private async calculateReceivables(asOfDate: Date): Promise<number> {
    // Orders that are pending payment
    const pending = await prisma.order.aggregate({
      where: {
        created_at: { lte: asOfDate },
        payment_status: 'pending',
      },
      _sum: { total: true },
    });

    return (pending._sum.total || 0) / 100;
  }

  private async calculatePayables(asOfDate: Date): Promise<number> {
    // This would track vendor payables
    return 0;
  }
}

export default BalanceSheet;
