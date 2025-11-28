/**
 * Flash Sale Countdown Manager
 * Purpose: Manage time-limited flash sales with countdown
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface FlashSale {
  id?: number;
  name: string;
  productIds: number[];
  discountPercent: number;
  startTime: Date;
  endTime: Date;
  maxQuantity?: number;
  soldQuantity?: number;
  isActive: boolean;
}

export class CountdownManager {
  /**
   * Create flash sale
   */
  async create(sale: FlashSale): Promise<FlashSale> {
    logger.info('Creating flash sale', { name: sale.name });

    const created = await prisma.flashSale.create({
      data: {
        name: sale.name,
        product_ids: JSON.stringify(sale.productIds),
        discount_percent: sale.discountPercent,
        start_time: sale.startTime,
        end_time: sale.endTime,
        max_quantity: sale.maxQuantity,
        sold_quantity: 0,
        is_active: sale.isActive,
        created_at: new Date(),
      },
    });

    return this.mapToFlashSale(created);
  }

  /**
   * Get time remaining
   */
  getTimeRemaining(endTime: Date): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false,
    };
  }

  /**
   * Check if sale is active
   */
  async isActive(saleId: number): Promise<boolean> {
    const sale = await prisma.flashSale.findUnique({
      where: { id: saleId },
    });

    if (!sale || !sale.is_active) return false;

    const now = new Date();
    return now >= sale.start_time && now <= sale.end_time;
  }

  /**
   * Get active sales
   */
  async getActive(): Promise<FlashSale[]> {
    const now = new Date();
    
    const sales = await prisma.flashSale.findMany({
      where: {
        is_active: true,
        start_time: { lte: now },
        end_time: { gte: now },
      },
    });

    return sales.map(s => this.mapToFlashSale(s));
  }

  private mapToFlashSale(record: any): FlashSale {
    return {
      id: record.id,
      name: record.name,
      productIds: JSON.parse(record.product_ids || '[]'),
      discountPercent: record.discount_percent,
      startTime: record.start_time,
      endTime: record.end_time,
      maxQuantity: record.max_quantity,
      soldQuantity: record.sold_quantity,
      isActive: record.is_active,
    };
  }
}

export default CountdownManager;
