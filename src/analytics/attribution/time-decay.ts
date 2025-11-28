/**
 * Time-Decay Attribution Model
 * Purpose: Give more credit to touchpoints closer to conversion
 * Use Case: Focus on conversion-driving touchpoints
 * 
 * @example
 * Journey: Google Ad (30 days ago) -> Email (7 days ago) -> Social (1 day ago)
 * Credit: Google Ad (10%) + Email (30%) + Social (60%)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AttributionResult } from './first-touch';

export class TimeDecayAttribution {
  private halfLifeDays = 7; // Half-life for exponential decay

  async attribute(
    userId: number,
    conversionDate: Date
  ): Promise<Map<string, AttributionResult>> {
    logger.info('Running time-decay attribution', { userId });

    const touchpoints = await this.getTouchpoints(userId, conversionDate);
    const attributionMap = new Map<string, AttributionResult>();

    if (touchpoints.length === 0) {
      return attributionMap;
    }

    const conversion = await this.getConversion(userId, conversionDate);
    const weights = this.calculateWeights(touchpoints, conversionDate);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    for (let i = 0; i < touchpoints.length; i++) {
      const touch = touchpoints[i];
      const credit = weights[i] / totalWeight;
      const revenue = ((conversion?.amount || 0) * credit) / 100;

      const existing = attributionMap.get(touch.channel);

      if (existing) {
        existing.credit += credit;
        existing.conversions += credit;
        existing.revenue += revenue;
      } else {
        attributionMap.set(touch.channel, {
          channel: touch.channel,
          credit,
          percentage: credit * 100,
          conversions: credit,
          revenue,
        });
      }
    }

    return attributionMap;
  }

  /**
   * Calculate exponential decay weights
   */
  private calculateWeights(touchpoints: any[], conversionDate: Date): number[] {
    return touchpoints.map(touch => {
      const daysSince = Math.floor(
        (conversionDate.getTime() - touch.created_at.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Exponential decay: weight = 2^(-days/halfLife)
      return Math.pow(2, -daysSince / this.halfLifeDays);
    });
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
    return await prisma.touchpoint.findMany({
      where: {
        user_id: userId,
        created_at: { lt: beforeDate },
      },
      orderBy: { created_at: 'asc' },
    });
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

export default TimeDecayAttribution;
