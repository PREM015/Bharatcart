/**
 * Last-Touch Attribution Model
 * Purpose: Credit last interaction before conversion
 * Use Case: Understanding conversion drivers
 */

import { logger } from '@/lib/logger';
import { FirstTouchAttribution, Touchpoint, AttributionResult } from './first-touch';

export class LastTouchAttribution extends FirstTouchAttribution {
  /**
   * Attribute conversion to last touchpoint
   */
  async attribute(
    userId: number,
    conversionDate: Date
  ): Promise<AttributionResult | null> {
    logger.info('Running last-touch attribution', { userId });

    const touchpoints = await this['getTouchpoints'](userId, conversionDate);

    if (touchpoints.length === 0) {
      return null;
    }

    // Last touchpoint gets all credit
    const lastTouch = touchpoints[touchpoints.length - 1];
    const conversion = await this['getConversion'](userId, conversionDate);

    return {
      channel: lastTouch.channel,
      credit: 1.0,
      percentage: 100,
      conversions: 1,
      revenue: conversion?.amount || 0,
    };
  }

  async generateReport(startDate: Date, endDate: Date) {
    const results = await this.attributeAll(startDate, endDate);

    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);

    return {
      period: { start: startDate, end: endDate },
      model: 'last-touch',
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

export default LastTouchAttribution;
