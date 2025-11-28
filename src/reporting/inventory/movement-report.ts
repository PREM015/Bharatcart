/**
 * Inventory Movement Report
 * Purpose: Track inventory ins and outs
 * Description: Stock movements, turnover rate
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface MovementReportData {
  period: string;
  movements: Array<{
    productId: number;
    productName: string;
    openingStock: number;
    stockIn: number;
    stockOut: number;
    closingStock: number;
    turnoverRate: number;
  }>;
  summary: {
    totalStockIn: number;
    totalStockOut: number;
    averageTurnoverRate: number;
  };
}

export class MovementReport {
  async generate(startDate: Date, endDate: Date): Promise<MovementReportData> {
    logger.info('Generating inventory movement report', { startDate, endDate });

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock_quantity: true,
      },
    });

    const movements = await Promise.all(
      products.map(async (product) => {
        const stockOut = await this.calculateStockOut(
          product.id,
          startDate,
          endDate
        );

        const openingStock = product.stock_quantity + stockOut;
        const stockIn = 0; // Would track inventory receipts
        const closingStock = product.stock_quantity;
        const turnoverRate = openingStock > 0 ? (stockOut / openingStock) * 100 : 0;

        return {
          productId: product.id,
          productName: product.name,
          openingStock,
          stockIn,
          stockOut,
          closingStock,
          turnoverRate,
        };
      })
    );

    const summary = {
      totalStockIn: movements.reduce((sum, m) => sum + m.stockIn, 0),
      totalStockOut: movements.reduce((sum, m) => sum + m.stockOut, 0),
      averageTurnoverRate:
        movements.reduce((sum, m) => sum + m.turnoverRate, 0) / movements.length,
    };

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      movements,
      summary,
    };
  }

  private async calculateStockOut(
    productId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const orderItems = await prisma.orderItem.aggregate({
      where: {
        product_id: productId,
        order: {
          created_at: { gte: startDate, lte: endDate },
          status: { notIn: ['cancelled'] },
        },
      },
      _sum: { quantity: true },
    });

    return orderItems._sum.quantity || 0;
  }
}

export default MovementReport;
