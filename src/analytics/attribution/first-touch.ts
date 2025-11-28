/**
 * First-Touch Attribution Model
 * Purpose: Credit first interaction that led to conversion
 * Use Case: Understanding initial customer acquisition channels
 * 
 * How it works:
 * - Gives 100% credit to the first touchpoint
 * - Ignores all subsequent interactions
 * - Best for awareness and acquisition campaigns
 * 
 * @example
 * Journey: Google Ad -> Email -> Social -> Purchase
 * Credit: Google Ad (100%)
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface Touchpoint {
  id: number;
  userId: number;
  channel: string;
  campaign?: string;
  medium?: string;
  source?: string;
  timestamp: Date;
  sessionId: string;
}

export interface AttributionResult {
  channel: string;
  credit: number;
  percentage: number;
  conversions: number;
  revenue: number;
}

export class FirstTouchAttribution {
  /**
   * Attribute conversion to first touchpoint
   */
  async attribute(
    userId: number,
    conversionDate: Date
  ): Promise<AttributionResult | null> {
    logger.info('Running first-touch attribution', { userId });

    try {
      // Get all touchpoints before conversion
      const touchpoints = await this.getTouchpoints(userId, conversionDate);

      if (touchpoints.length === 0) {
        logger.warn('No touchpoints found', { userId });
        return null;
      }

      // First touchpoint gets all credit
      const firstTouch = touchpoints[0];

      // Get conversion value
      const conversion = await this.getConversion(userId, conversionDate);

      return {
        channel: firstTouch.channel,
        credit: 1.0,
        percentage: 100,
        conversions: 1,
        revenue: conversion?.amount || 0,
      };
    } catch (error) {
      logger.error('First-touch attribution failed', { error, userId });
      throw error;
    }
  }

  /**
   * Attribute all conversions in date range
   */
  async attributeAll(
    startDate: Date,
    endDate: Date
  ): Promise<AttributionResult[]> {
    logger.info('Running batch first-touch attribution', { startDate, endDate });

    const conversions = await this.getConversions(startDate, endDate);
    const attributionMap = new Map<string, AttributionResult>();

    for (const conversion of conversions) {
      const result = await this.attribute(
        conversion.user_id,
        conversion.created_at
      );

      if (result) {
        const existing = attributionMap.get(result.channel);

        if (existing) {
          existing.conversions += result.conversions;
          existing.revenue += result.revenue;
        } else {
          attributionMap.set(result.channel, result);
        }
      }
    }

    // Calculate percentages
    const total = Array.from(attributionMap.values()).reduce(
      (sum, r) => sum + r.conversions,
      0
    );

    for (const result of attributionMap.values()) {
      result.percentage = total > 0 ? (result.conversions / total) * 100 : 0;
    }

    return Array.from(attributionMap.values()).sort(
      (a, b) => b.revenue - a.revenue
    );
  }

  /**
   * Get user touchpoints
   */
  private async getTouchpoints(
    userId: number,
    beforeDate: Date
  ): Promise<Touchpoint[]> {
    const touchpoints = await prisma.touchpoint.findMany({
      where: {
        user_id: userId,
        created_at: { lt: beforeDate },
      },
      orderBy: { created_at: 'asc' },
    });

    return touchpoints.map(t => ({
      id: t.id,
      userId: t.user_id,
      channel: t.channel,
      campaign: t.campaign || undefined,
      medium: t.medium || undefined,
      source: t.source || undefined,
      timestamp: t.created_at,
      sessionId: t.session_id,
    }));
  }

  /**
   * Get conversion
   */
  private async getConversion(userId: number, date: Date) {
    return await prisma.order.findFirst({
      where: {
        user_id: userId,
        created_at: date,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: {
        total: true,
      },
    });
  }

  /**
   * Get all conversions in range
   */
  private async getConversions(startDate: Date, endDate: Date) {
    return await prisma.order.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
    });
  }

  /**
   * Generate report
   */
  async generateReport(startDate: Date, endDate: Date) {
    const results = await this.attributeAll(startDate, endDate);

    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);

    return {
      period: { start: startDate, end: endDate },
      model: 'first-touch',
      summary: {
        totalRevenue,
        totalConversions,
        channelCount: results.length,
      },
      channels: results,
      topChannel: results[0],
    };
  }
}

export default FirstTouchAttribution;
