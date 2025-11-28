/**
 * Demand Planning
 * Purpose: Forecast future demand based on historical data
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface DemandForecast {
  productId: number;
  productName: string;
  currentStock: number;
  forecastedDemand: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
  recommendedOrder: number;
  confidence: number;
}

export class DemandPlanner {
  /**
   * Forecast demand for product
   */
  async forecastDemand(productId: number): Promise<DemandForecast> {
    logger.info('Forecasting demand', { productId });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock_quantity: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get historical sales
    const historicalSales = await this.getHistoricalSales(productId, 90);

    // Calculate average daily demand
    const avgDailyDemand = this.calculateAverageDemand(historicalSales);

    // Apply seasonality and trends
    const seasonalityFactor = this.getSeasonalityFactor(new Date());
    const trendFactor = this.calculateTrend(historicalSales);

    const adjustedDemand = avgDailyDemand * seasonalityFactor * trendFactor;

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock_quantity,
      forecastedDemand: {
        next7Days: Math.round(adjustedDemand * 7),
        next30Days: Math.round(adjustedDemand * 30),
        next90Days: Math.round(adjustedDemand * 90),
      },
      recommendedOrder: this.calculateRecommendedOrder(
        product.stock_quantity,
        adjustedDemand
      ),
      confidence: this.calculateConfidence(historicalSales),
    };
  }

  /**
   * Get historical sales data
   */
  private async getHistoricalSales(
    productId: number,
    days: number
  ): Promise<number[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.orderItem.findMany({
      where: {
        product_id: productId,
        order: {
          created_at: { gte: startDate },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      select: {
        quantity: true,
        order: { select: { created_at: true } },
      },
    });

    // Group by day
    const dailySales = new Array(days).fill(0);
    const today = new Date();

    sales.forEach(sale => {
      const daysDiff = Math.floor(
        (today.getTime() - sale.order.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff < days) {
        dailySales[days - daysDiff - 1] += sale.quantity;
      }
    });

    return dailySales;
  }

  /**
   * Calculate average daily demand
   */
  private calculateAverageDemand(sales: number[]): number {
    if (sales.length === 0) return 0;
    const sum = sales.reduce((acc, val) => acc + val, 0);
    return sum / sales.length;
  }

  /**
   * Get seasonality factor
   */
  private getSeasonalityFactor(date: Date): number {
    const month = date.getMonth();
    
    // Higher demand in holiday months
    const seasonalFactors = [
      1.0, 0.9, 0.9, 1.0, 1.0, 1.0, // Jan-Jun
      1.1, 1.1, 1.0, 1.1, 1.3, 1.5, // Jul-Dec (holiday season)
    ];

    return seasonalFactors[month];
  }

  /**
   * Calculate trend factor
   */
  private calculateTrend(sales: number[]): number {
    if (sales.length < 14) return 1.0;

    const recentAvg = sales.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const previousAvg = sales.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;

    if (previousAvg === 0) return 1.0;

    return recentAvg / previousAvg;
  }

  /**
   * Calculate recommended order quantity
   */
  private calculateRecommendedOrder(
    currentStock: number,
    avgDailyDemand: number
  ): number {
    const leadTimeDays = 14; // Assume 2 weeks lead time
    const safetyStock = avgDailyDemand * 7; // 1 week safety stock
    
    const reorderPoint = (avgDailyDemand * leadTimeDays) + safetyStock;

    if (currentStock < reorderPoint) {
      const economicOrderQuantity = Math.sqrt(
        (2 * avgDailyDemand * 365 * 50) / 5 // Simplified EOQ
      );
      return Math.round(economicOrderQuantity);
    }

    return 0;
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(sales: number[]): number {
    if (sales.length < 7) return 0.3;

    const avg = this.calculateAverageDemand(sales);
    const variance = sales.reduce(
      (acc, val) => acc + Math.pow(val - avg, 2),
      0
    ) / sales.length;
    
    const coefficientOfVariation = Math.sqrt(variance) / avg;

    // Lower CV = higher confidence
    if (coefficientOfVariation < 0.3) return 0.9;
    if (coefficientOfVariation < 0.5) return 0.7;
    if (coefficientOfVariation < 1.0) return 0.5;
    return 0.3;
  }

  /**
   * Bulk forecast for all products
   */
  async forecastAll(): Promise<DemandForecast[]> {
    const products = await prisma.product.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    return Promise.all(products.map(p => this.forecastDemand(p.id)));
  }
}

export default DemandPlanner;
