/**
 * Reorder Point Calculator
 * Purpose: Calculate when to reorder products
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ReorderPoint {
  productId: number;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  avgDailyUsage: number;
  shouldReorder: boolean;
}

export class ReorderPointCalculator {
  /**
   * Calculate reorder point for product
   */
  async calculate(productId: number): Promise<ReorderPoint> {
    logger.info('Calculating reorder point', { productId });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock_quantity: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const avgDailyUsage = await this.getAverageDailyUsage(productId);
    const leadTimeDays = await this.getLeadTime(productId);
    const safetyStock = this.calculateSafetyStock(avgDailyUsage, leadTimeDays);
    
    const reorderPoint = (avgDailyUsage * leadTimeDays) + safetyStock;
    const reorderQuantity = this.calculateEOQ(productId, avgDailyUsage);

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock_quantity,
      reorderPoint: Math.round(reorderPoint),
      reorderQuantity: Math.round(reorderQuantity),
      safetyStock: Math.round(safetyStock),
      leadTimeDays,
      avgDailyUsage,
      shouldReorder: product.stock_quantity <= reorderPoint,
    };
  }

  /**
   * Get average daily usage
   */
  private async getAverageDailyUsage(productId: number): Promise<number> {
    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.orderItem.aggregate({
      where: {
        product_id: productId,
        order: {
          created_at: { gte: startDate },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      _sum: { quantity: true },
    });

    return (sales._sum.quantity || 0) / days;
  }

  /**
   * Get lead time for product
   */
  private async getLeadTime(productId: number): Promise<number> {
    // Would check supplier lead times
    return 14; // Default 14 days
  }

  /**
   * Calculate safety stock
   */
  private calculateSafetyStock(avgDailyUsage: number, leadTime: number): number {
    const serviceLevelFactor = 1.65; // 95% service level (Z-score)
    const demandVariability = avgDailyUsage * 0.3; // 30% variability
    const leadTimeVariability = leadTime * 0.2; // 20% variability

    return serviceLevelFactor * Math.sqrt(
      Math.pow(demandVariability * leadTime, 2) +
      Math.pow(avgDailyUsage * leadTimeVariability, 2)
    );
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   */
  private calculateEOQ(productId: number, avgDailyUsage: number): number {
    const annualDemand = avgDailyUsage * 365;
    const orderingCost = 50; // Cost per order
    const holdingCostPerUnit = 5; // Annual holding cost per unit

    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  }

  /**
   * Get products that need reordering
   */
  async getProductsNeedingReorder(): Promise<ReorderPoint[]> {
    const products = await prisma.product.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    const reorderPoints = await Promise.all(
      products.map(p => this.calculate(p.id))
    );

    return reorderPoints.filter(rp => rp.shouldReorder);
  }
}

export default ReorderPointCalculator;
