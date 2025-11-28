/**
 * Tiered Pricing
 * Purpose: Different prices for different quantity ranges
 */

import { logger } from '@/lib/logger';

export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export class TieredPricing {
  /**
   * Calculate price with tiered pricing
   */
  calculate(quantity: number, tiers: PriceTier[]): number {
    logger.info('Calculating tiered price', { quantity });

    let totalPrice = 0;
    let remainingQuantity = quantity;

    const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

    for (const tier of sortedTiers) {
      if (remainingQuantity === 0) break;

      const tierMax = tier.maxQuantity || Infinity;
      const tierQuantity = Math.min(
        remainingQuantity,
        tierMax - tier.minQuantity + 1
      );

      totalPrice += tierQuantity * tier.pricePerUnit;
      remainingQuantity -= tierQuantity;
    }

    return totalPrice / 100;
  }

  /**
   * Get applicable tier for quantity
   */
  getTierForQuantity(quantity: number, tiers: PriceTier[]): PriceTier | null {
    return tiers.find(
      tier =>
        quantity >= tier.minQuantity &&
        (!tier.maxQuantity || quantity <= tier.maxQuantity)
    ) || null;
  }
}

export default TieredPricing;
