/**
 * Coupon Validation
 * Purpose: Validate coupon codes and calculate discounts
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CouponUsageLimiter } from './usage-limiter';

export interface ValidationResult {
  valid: boolean;
  coupon?: any;
  discountAmount?: number;
  finalAmount?: number;
  reason?: string;
}

export class CouponValidator {
  private limiter: CouponUsageLimiter;

  constructor() {
    this.limiter = new CouponUsageLimiter();
  }

  /**
   * Validate and calculate discount
   */
  async validate(
    code: string,
    userId: number,
    orderValue: number,
    items?: Array<{ productId: number; quantity: number; price: number }>
  ): Promise<ValidationResult> {
    logger.info('Validating coupon', { code, userId, orderValue });

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return { valid: false, reason: 'Invalid coupon code' };
    }

    const usageCheck = await this.limiter.canUse(code, userId, orderValue);
    if (!usageCheck.allowed) {
      return { valid: false, reason: usageCheck.reason };
    }

    const discountAmount = this.calculateDiscount(
      coupon.discount_type,
      coupon.discount_value,
      orderValue
    );

    const finalAmount = Math.max(0, orderValue - discountAmount);

    return {
      valid: true,
      coupon,
      discountAmount,
      finalAmount,
    };
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(
    type: string,
    value: number,
    orderValue: number
  ): number {
    if (type === 'percentage') {
      return (orderValue * value) / 100;
    }

    // Fixed amount (stored in cents)
    return Math.min(value / 100, orderValue);
  }

  /**
   * Validate multiple coupons (stacking)
   */
  async validateMultiple(
    codes: string[],
    userId: number,
    orderValue: number
  ): Promise<ValidationResult> {
    let totalDiscount = 0;
    const validCoupons: any[] = [];

    for (const code of codes) {
      const result = await this.validate(code, userId, orderValue - totalDiscount);
      
      if (result.valid && result.discountAmount) {
        totalDiscount += result.discountAmount;
        validCoupons.push(result.coupon);
      }
    }

    return {
      valid: validCoupons.length > 0,
      coupon: validCoupons,
      discountAmount: totalDiscount,
      finalAmount: Math.max(0, orderValue - totalDiscount),
    };
  }
}

export default CouponValidator;
