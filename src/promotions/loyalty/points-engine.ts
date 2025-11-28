/**
 * Loyalty Points Engine
 * Purpose: Calculate and manage loyalty points
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class PointsEngine {
  /**
   * Calculate points for purchase
   */
  calculatePoints(orderTotal: number, multiplier: number = 1): number {
    // 1 point per dollar spent
    const basePoints = Math.floor(orderTotal);
    return Math.floor(basePoints * multiplier);
  }

  /**
   * Award points to user
   */
  async awardPoints(
    userId: number,
    points: number,
    reason: string,
    orderId?: number
  ): Promise<void> {
    logger.info('Awarding points', { userId, points, reason });

    await prisma.loyaltyTransaction.create({
      data: {
        user_id: userId,
        points,
        type: 'earn',
        reason,
        order_id: orderId,
        created_at: new Date(),
      },
    });

    await this.updateBalance(userId, points);
  }

  /**
   * Redeem points
   */
  async redeemPoints(
    userId: number,
    points: number,
    reason: string
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);

    if (balance < points) {
      logger.warn('Insufficient points', { userId, requested: points, balance });
      return false;
    }

    await prisma.loyaltyTransaction.create({
      data: {
        user_id: userId,
        points: -points,
        type: 'redeem',
        reason,
        created_at: new Date(),
      },
    });

    await this.updateBalance(userId, -points);
    return true;
  }

  /**
   * Get user's points balance
   */
  async getBalance(userId: number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyalty_points: true },
    });

    return user?.loyalty_points || 0;
  }

  /**
   * Update points balance
   */
  private async updateBalance(userId: number, points: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loyalty_points: { increment: points },
      },
    });
  }

  /**
   * Get transaction history
   */
  async getHistory(userId: number, limit: number = 50) {
    return await prisma.loyaltyTransaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Calculate points value in currency
   */
  pointsToValue(points: number, conversionRate: number = 0.01): number {
    return points * conversionRate;
  }
}

export default PointsEngine;
