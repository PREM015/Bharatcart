/**
 * Linear Attribution Model
 * Purpose: Distribute credit equally across all touchpoints
 * Use Case: Multi-channel journey analysis
 * 
 * @example
 * Journey: Google Ad -> Email -> Social -> Purchase
 * Credit: Google Ad (25%) + Email (25%) + Social (25%) + Direct (25%)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AttributionResult } from './first-touch';

export class LinearAttribution {
  async attribute(
    userId: number,
    conversionDate: Date
  ): Promise<Map<string, AttributionResult>> {
    logger.info('Running linear attribution', { userId });

    const touchpoints = await this.getTouchpoints(userId, conversionDate);
    const attributionMap = new Map<string, AttributionResult>();

    if (touchpoints.length === 0) {
      return attributionMap;
    }

    const conversion = await this.getConversion(userId, conversionDate);
    const creditPerTouch = 1.0 / touchpoints.length;
    const revenuePerTouch = (conversion?.amount || 0) / touchpoints.length;

    for (const touch of touchpoints) {
      const existing = attributionMap.get(touch.channel);

      if (existing) {
        existing.credit += creditPerTouch;
        existing.conversions += creditPerTouch;
        existing.revenue += revenuePerTouch;
      } else {
        attributionMap.set(touch.channel, {
          channel: touch.channel,
          credit: creditPerTouch,
          percentage: (creditPerTouch / touchpoints.length) * 100,
          conversions: creditPerTouch,
          revenue: revenuePerTouch,
        });
      }
    }

    return attributionMap;
  }

  async attributeAll(startDate: Date, endDate: Date): Promise<AttributionResult[]> {
    const conversions = await this.getConversions(startDate, endDate);
    const aggregatedMap = new Map<string, AttributionResult>();

    for (const conversion of conversions) {
      const channelMap = await this.attribute(
        conversion.user_id,
        conversion.created_at
      );

      for (const [channel, result] of channelMap) {
        const existing = aggregatedMap.get(channel);

        if (existing) {
          existing.credit += result.credit;
          existing.conversions += result.conversions;
          existing.revenue += result.revenue;
        } else {
          aggregatedMap.set(channel, { ...result });
        }
      }
    }

    const total = Array.from(aggregatedMap.values()).reduce(
      (sum, r) => sum + r.conversions,
      0
    );

    for (const result of aggregatedMap.values()) {
      result.percentage = total > 0 ? (result.conversions / total) * 100 : 0;
    }

    return Array.from(aggregatedMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  private async getTouchpoints(userId: number, beforeDate: Date) {
    const touchpoints = await prisma.touchpoint.findMany({
      where: {
        user_id: userId,
        created_at: { lt: beforeDate },
      },
      orderBy: { created_at: 'asc' },
    });

    return touchpoints;
  }

  private async getConversion(userId: number, date: Date) {
    return await prisma.order.findFirst({
      where: {
        user_id: userId,
        created_at: date,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: { total: true },
    });
  }

  private async getConversions(startDate: Date, endDate: Date) {
    return await prisma.order.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
    });
  }
}

export default LinearAttribution;
