/**
 * Cash Flow Statement
 * Purpose: Track cash inflows and outflows
 * Description: Operating, investing, and financing activities
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface CashFlowData {
  period: string;
  operatingActivities: {
    cashFromSales: number;
    cashToSuppliers: number;
    cashToEmployees: number;
    netOperatingCash: number;
  };
  investingActivities: {
    equipmentPurchases: number;
    netInvestingCash: number;
  };
  financingActivities: {
    loanProceeds: number;
    loanRepayments: number;
    netFinancingCash: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export class CashFlow {
  async generate(startDate: Date, endDate: Date): Promise<CashFlowData> {
    logger.info('Generating cash flow statement', { startDate, endDate });

    const cashFromSales = await this.calculateCashFromSales(startDate, endDate);
    const cashToSuppliers = await this.calculateCashToSuppliers(startDate, endDate);

    const operatingActivities = {
      cashFromSales,
      cashToSuppliers,
      cashToEmployees: 0,
      netOperatingCash: cashFromSales - cashToSuppliers,
    };

    const investingActivities = {
      equipmentPurchases: 0,
      netInvestingCash: 0,
    };

    const financingActivities = {
      loanProceeds: 0,
      loanRepayments: 0,
      netFinancingCash: 0,
    };

    const netCashFlow =
      operatingActivities.netOperatingCash +
      investingActivities.netInvestingCash +
      financingActivities.netFinancingCash;

    const beginningCash = await this.calculateBeginningCash(startDate);

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      beginningCash,
      endingCash: beginningCash + netCashFlow,
    };
  }

  private async calculateCashFromSales(startDate: Date, endDate: Date): Promise<number> {
    const orders = await prisma.order.aggregate({
      where: {
        created_at: { gte: startDate, lte: endDate },
        payment_status: 'paid',
      },
      _sum: { total: true },
    });

    return (orders._sum.total || 0) / 100;
  }

  private async calculateCashToSuppliers(startDate: Date, endDate: Date): Promise<number> {
    // Calculate based on COGS
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          created_at: { gte: startDate, lte: endDate },
          status: 'delivered',
        },
      },
      include: {
        product: { select: { cost_price: true } },
      },
    });

    const total = orderItems.reduce((sum, item) => {
      return sum + ((item.product.cost_price || 0) * item.quantity);
    }, 0);

    return total / 100;
  }

  private async calculateBeginningCash(startDate: Date): Promise<number> {
    const previousOrders = await prisma.order.aggregate({
      where: {
        created_at: { lt: startDate },
        payment_status: 'paid',
      },
      _sum: { total: true },
    });

    return (previousOrders._sum.total || 0) / 100;
  }
}

export default CashFlow;
