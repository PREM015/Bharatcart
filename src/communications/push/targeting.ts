/**
 * Push Notification Targeting
 * Purpose: Target specific user segments for push notifications
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface TargetingCriteria {
  userIds?: number[];
  segments?: string[];
  tags?: string[];
  location?: {
    country?: string;
    city?: string;
  };
  deviceType?: 'android' | 'ios' | 'web';
  lastActiveWithin?: number; // days
}

export class PushTargeting {
  /**
   * Get targeted user tokens
   */
  async getTargetedTokens(criteria: TargetingCriteria): Promise<string[]> {
    logger.info('Getting targeted tokens', { criteria });

    const where: any = { is_active: true };

    if (criteria.userIds && criteria.userIds.length > 0) {
      where.user_id = { in: criteria.userIds };
    }

    if (criteria.deviceType) {
      where.platform = criteria.deviceType;
    }

    if (criteria.lastActiveWithin) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.lastActiveWithin);
      where.last_active = { gte: cutoffDate };
    }

    const devices = await prisma.deviceToken.findMany({
      where,
      select: { token: true },
    });

    return devices.map(d => d.token);
  }

  /**
   * Get users by segment
   */
  async getUsersBySegment(segment: string): Promise<number[]> {
    let userIds: number[] = [];

    switch (segment) {
      case 'active':
        userIds = await this.getActiveUsers();
        break;
      case 'new':
        userIds = await this.getNewUsers();
        break;
      case 'vip':
        userIds = await this.getVIPUsers();
        break;
      case 'churned':
        userIds = await this.getChurnedUsers();
        break;
    }

    return userIds;
  }

  /**
   * Get active users (activity in last 7 days)
   */
  private async getActiveUsers(): Promise<number[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const users = await prisma.user.findMany({
      where: {
        last_login: { gte: sevenDaysAgo },
      },
      select: { id: true },
    });

    return users.map(u => u.id);
  }

  /**
   * Get new users (registered in last 30 days)
   */
  private async getNewUsers(): Promise<number[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await prisma.user.findMany({
      where: {
        created_at: { gte: thirtyDaysAgo },
      },
      select: { id: true },
    });

    return users.map(u => u.id);
  }

  /**
   * Get VIP users (high value customers)
   */
  private async getVIPUsers(): Promise<number[]> {
    const users = await prisma.user.findMany({
      where: {
        loyalty_tier: 'platinum',
      },
      select: { id: true },
    });

    return users.map(u => u.id);
  }

  /**
   * Get churned users (no activity in 60+ days)
   */
  private async getChurnedUsers(): Promise<number[]> {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const users = await prisma.user.findMany({
      where: {
        last_login: { lt: sixtyDaysAgo },
      },
      select: { id: true },
    });

    return users.map(u => u.id);
  }

  /**
   * Get users by location
   */
  async getUsersByLocation(country?: string, city?: string): Promise<number[]> {
    const where: any = {};

    if (country || city) {
      where.OR = [];

      if (country) {
        where.OR.push({ shipping_country: country });
        where.OR.push({ billing_country: country });
      }

      if (city) {
        where.OR.push({ shipping_city: city });
        where.OR.push({ billing_city: city });
      }
    }

    const addresses = await prisma.address.findMany({
      where,
      distinct: ['user_id'],
      select: { user_id: true },
    });

    return addresses.map(a => a.user_id);
  }
}

export default PushTargeting;
