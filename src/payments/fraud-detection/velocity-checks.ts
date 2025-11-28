/**
 * Velocity Checks
 * Purpose: Detect suspicious transaction patterns
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class VelocityChecks {
  /**
   * Check transaction velocity for user
   */
  async checkUserVelocity(userId: number, timeWindow: number = 3600): Promise<{
    count: number;
    exceeded: boolean;
    limit: number;
  }> {
    const since = new Date(Date.now() - timeWindow * 1000);

    const count = await prisma.paymentTransaction.count({
      where: {
        user_id: userId,
        created_at: { gte: since },
      },
    });

    const limit = 5; // Max 5 transactions per hour
    const exceeded = count >= limit;

    if (exceeded) {
      logger.warn('User velocity limit exceeded', { userId, count });
    }

    return { count, exceeded, limit };
  }

  /**
   * Check card velocity
   */
  async checkCardVelocity(cardFingerprint: string): Promise<{
    count: number;
    exceeded: boolean;
  }> {
    const since = new Date(Date.now() - 3600 * 1000);

    const count = await prisma.paymentTransaction.count({
      where: {
        card_fingerprint: cardFingerprint,
        created_at: { gte: since },
      },
    });

    const limit = 3;
    return { count, exceeded: count >= limit };
  }

  /**
   * Check IP velocity
   */
  async checkIPVelocity(ipAddress: string): Promise<{
    count: number;
    exceeded: boolean;
  }> {
    const since = new Date(Date.now() - 3600 * 1000);

    const count = await prisma.paymentTransaction.count({
      where: {
        ip_address: ipAddress,
        created_at: { gte: since },
      },
    });

    const limit = 10;
    return { count, exceeded: count >= limit };
  }

  /**
   * Check amount velocity (total spent in time window)
   */
  async checkAmountVelocity(userId: number): Promise<{
    total: number;
    exceeded: boolean;
    limit: number;
  }> {
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    const result = await prisma.paymentTransaction.aggregate({
      where: {
        user_id: userId,
        created_at: { gte: since },
        status: 'success',
      },
      _sum: { amount: true },
    });

    const total = (result._sum.amount || 0) / 100;
    const limit = 10000; // $10,000 per day
    
    return { total, exceeded: total >= limit, limit };
  }
}

export default VelocityChecks;
