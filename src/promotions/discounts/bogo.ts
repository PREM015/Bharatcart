/**
 * Buy One Get One (BOGO) Discount
 * Purpose: Implement BOGO promotional offers
 * 
 * Types:
 * - BOGO Free (Buy 1 Get 1 Free)
 * - BOGO 50% (Buy 1 Get 1 Half Off)
 * - BOGO Custom (Buy X Get Y at Z% off)
 */

import { logger } from '@/lib/logger';

export interface BOGORule {
  buyQuantity: number;
  getQuantity: number;
  discountPercent: number;
  applicableProductIds?: number[];
  applicableCategoryIds?: number[];
  maxApplications?: number;
}

export class BOGODiscount {
  /**
   * Calculate BOGO discount
   */
  calculate(
    items: Array<{ productId: number; quantity: number; price: number }>,
    rule: BOGORule
  ): {
    discountAmount: number;
    affectedItems: Array<{ productId: number; discountedQuantity: number }>;
  } {
    logger.info('Calculating BOGO discount', { rule });

    let totalDiscount = 0;
    const affectedItems: Array<{ productId: number; discountedQuantity: number }> = [];

    for (const item of items) {
      if (!this.isEligible(item.productId, rule)) continue;

      const sets = Math.floor(item.quantity / (rule.buyQuantity + rule.getQuantity));
      const applicableSets = rule.maxApplications
        ? Math.min(sets, rule.maxApplications)
        : sets;

      const discountedQuantity = applicableSets * rule.getQuantity;
      const itemDiscount = (item.price * discountedQuantity * rule.discountPercent) / 100;

      totalDiscount += itemDiscount;
      affectedItems.push({ productId: item.productId, discountedQuantity });
    }

    return { discountAmount: totalDiscount / 100, affectedItems };
  }

  /**
   * Check if product is eligible
   */
  private isEligible(productId: number, rule: BOGORule): boolean {
    if (rule.applicableProductIds) {
      return rule.applicableProductIds.includes(productId);
    }

    // Would check category eligibility
    return true;
  }

  /**
   * Create BOGO Free rule
   */
  static createBOGOFree(productIds?: number[]): BOGORule {
    return {
      buyQuantity: 1,
      getQuantity: 1,
      discountPercent: 100,
      applicableProductIds: productIds,
    };
  }

  /**
   * Create BOGO 50% rule
   */
  static createBOGOHalfOff(productIds?: number[]): BOGORule {
    return {
      buyQuantity: 1,
      getQuantity: 1,
      discountPercent: 50,
      applicableProductIds: productIds,
    };
  }
}

export default BOGODiscount;
