/**
 * Quantity Discount
 * Purpose: Discount based on quantity purchased
 */

import { logger } from '@/lib/logger';

export interface QuantityTier {
  minQuantity: number;
  maxQuantity?: number;
  discountPercent: number;
}

export class QuantityDiscount {
  /**
   * Calculate quantity-based discount
   */
  calculate(
    quantity: number,
    unitPrice: number,
    tiers: QuantityTier[]
  ): number {
    logger.info('Calculating quantity discount', { quantity, unitPrice });

    const tier = this.findApplicableTier(quantity, tiers);
    if (!tier) return 0;

    const subtotal = unitPrice * quantity;
    return (subtotal * tier.discountPercent) / 100 / 100;
  }

  /**
   * Find applicable tier for quantity
   */
  private findApplicableTier(quantity: number, tiers: QuantityTier[]): QuantityTier | null {
    return tiers.find(
      tier =>
        quantity >= tier.minQuantity &&
        (!tier.maxQuantity || quantity <= tier.maxQuantity)
    ) || null;
  }

  /**
   * Get discount percentage for quantity
   */
  getDiscountPercent(quantity: number, tiers: QuantityTier[]): number {
    const tier = this.findApplicableTier(quantity, tiers);
    return tier ? tier.discountPercent : 0;
  }
}

export default QuantityDiscount;
