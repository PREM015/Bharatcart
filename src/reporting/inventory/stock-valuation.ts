/**
 * Stock Valuation Report
 * Purpose: Calculate total inventory value
 * Description: Inventory value by cost and retail price
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface StockValuationData {
  totalProducts: number;
  totalQuantity: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  profitMargin: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    quantity: number;
    costValue: number;
    retailValue: number;
  }>;
}

export class StockValuation {
  async generate(): Promise<StockValuationData> {
    logger.info('Generating stock valuation report');

    const products = await prisma.product.findMany({
      where: { is_active: true },
      include: {
        category: { select: { name: true } },
      },
    });

    const totalQuantity = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    const costValue = products.reduce((sum, p) => {
      return sum + (p.stock_quantity * (p.cost_price || 0));
    }, 0) / 100;

    const retailValue = products.reduce((sum, p) => {
      return sum + (p.stock_quantity * p.price);
    }, 0) / 100;

    const potentialProfit = retailValue - costValue;
    const profitMargin = retailValue > 0 ? (potentialProfit / retailValue) * 100 : 0;

    const byCategory = this.groupByCategory(products);

    return {
      totalProducts: products.length,
      totalQuantity,
      costValue,
      retailValue,
      potentialProfit,
      profitMargin,
      byCategory,
    };
  }

  private groupByCategory(products: any[]) {
    const categoryMap = new Map<number, {
      categoryName: string;
      quantity: number;
      costValue: number;
      retailValue: number;
    }>();

    products.forEach(product => {
      const categoryId = product.category_id;
      const categoryName = product.category?.name || 'Uncategorized';

      const existing = categoryMap.get(categoryId) || {
        categoryName,
        quantity: 0,
        costValue: 0,
        retailValue: 0,
      };

      existing.quantity += product.stock_quantity;
      existing.costValue += (product.stock_quantity * (product.cost_price || 0)) / 100;
      existing.retailValue += (product.stock_quantity * product.price) / 100;

      categoryMap.set(categoryId, existing);
    });

    return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      ...data,
    }));
  }
}

export default StockValuation;
