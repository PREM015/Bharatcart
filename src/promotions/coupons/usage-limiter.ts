/**
 * Coupon Usage Limiter
 * Purpose: Enforce usage limits and restrictions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class CouponUsageLimiter {
  /**
   * Check if coupon can be used
   */
  async canUse(
    code: string,
    userId: number,
    orderValue: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon) {
      return { allowed: false, reason: 'Coupon not found' };
    }

    if (!coupon.is_active) {
      return { allowed: false, reason: 'Coupon is inactive' };
    }

    if (coupon.expires_at && coupon.expires_at < new Date()) {
      return { allowed: false, reason: 'Coupon has expired' };
    }

    if (coupon.max_uses && coupon._count.usages >= coupon.max_uses) {
      return { allowed: false, reason: 'Coupon usage limit reached' };
    }

    if (coupon.max_uses_per_user) {
      const userUsageCount = await prisma.couponUsage.count({
        where: {
          coupon_code: code,
          user_id: userId,
        },
      });

      if (userUsageCount >= coupon.max_uses_per_user) {
        return { allowed: false, reason: 'User usage limit reached' };
      }
    }

    if (coupon.min_order_value && orderValue < coupon.min_order_value) {
      return {
        allowed: false,
        reason: `Minimum order value is $${coupon.min_order_value / 100}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record coupon usage
   */
  async recordUsage(
    code: string,
    userId: number,
    orderId: number,
    discountAmount: number
  ): Promise<void> {
    await prisma.couponUsage.create({
      data: {
        coupon_code: code,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount * 100,
        used_at: new Date(),
      },
    });

    logger.info('Coupon usage recorded', { code, userId, orderId });
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(code: string) {
    const [totalUses, uniqueUsers, totalDiscount] = await Promise.all([
      prisma.couponUsage.count({
        where: { coupon_code: code },
      }),
      prisma.couponUsage.groupBy({
        by: ['user_id'],
        where: { coupon_code: code },
      }),
      prisma.couponUsage.aggregate({
        where: { coupon_code: code },
        _sum: { discount_amount: true },
      }),
    ]);

    return {
      totalUses,
      uniqueUsers: uniqueUsers.length,
      totalDiscount: (totalDiscount._sum.discount_amount || 0) / 100,
    };
  }

  /**
   * Revoke user's coupon usage
   */
  async revokeUsage(code: string, userId: number): Promise<void> {
    await prisma.couponUsage.deleteMany({
      where: {
        coupon_code: code,
        user_id: userId,
      },
    });

    logger.info('Coupon usage revoked', { code, userId });
  }
}

export default CouponUsageLimiter;
