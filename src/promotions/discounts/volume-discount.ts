/**
 * Volume Discount
 * Purpose: Discount based on total order value
 */

import { logger } from '@/lib/logger';

export interface VolumeTier {
  minAmount: number;
  maxAmount?: number;
  discountPercent: number;
}

export class VolumeDiscount {
  /**
   * Calculate volume discount
   */
  calculate(orderTotal: number, tiers: VolumeTier[]): number {
    logger.info('Calculating volume discount', { orderTotal });

    const tier = this.findApplicableTier(orderTotal, tiers);
    if (!tier) return 0;

    return (orderTotal * tier.discountPercent) / 100;
  }

  /**
   * Find applicable tier
   */
  private findApplicableTier(amount: number, tiers: VolumeTier[]): VolumeTier | null {
    return tiers.find(
      tier =>
        amount >= tier.minAmount &&
        (!tier.maxAmount || amount <= tier.maxAmount)
    ) || null;
  }

  /**
   * Get next tier info
   */
  getNextTierInfo(currentAmount: number, tiers: VolumeTier[]): {
    nextTier: VolumeTier | null;
    amountToNext: number;
  } {
    const sortedTiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
    const nextTier = sortedTiers.find(tier => tier.minAmount > currentAmount);

    return {
      nextTier: nextTier || null,
      amountToNext: nextTier ? nextTier.minAmount - currentAmount : 0,
    };
  }
}

export default VolumeDiscount;
