/**
 * Discount Stacking
 * Purpose: Manage multiple concurrent discounts
 */

import { logger } from '@/lib/logger';

export interface Discount {
  id: string;
  type: 'percentage' | 'fixed';
  value: number;
  priority: number;
  stackable: boolean;
  maxAmount?: number;
}

export class DiscountStacking {
  /**
   * Calculate stacked discounts
   */
  calculate(
    originalAmount: number,
    discounts: Discount[]
  ): {
    totalDiscount: number;
    finalAmount: number;
    appliedDiscounts: Array<{ id: string; amount: number }>;
  } {
    logger.info('Calculating stacked discounts', {
      originalAmount,
      discountCount: discounts.length,
    });

    // Sort by priority (higher first)
    const sorted = [...discounts].sort((a, b) => b.priority - a.priority);

    let currentAmount = originalAmount;
    const appliedDiscounts: Array<{ id: string; amount: number }> = [];

    for (const discount of sorted) {
      if (!discount.stackable && appliedDiscounts.length > 0) {
        continue;
      }

      let discountAmount = 0;

      if (discount.type === 'percentage') {
        discountAmount = (currentAmount * discount.value) / 100;
      } else {
        discountAmount = discount.value / 100;
      }

      if (discount.maxAmount) {
        discountAmount = Math.min(discountAmount, discount.maxAmount / 100);
      }

      discountAmount = Math.min(discountAmount, currentAmount);
      currentAmount -= discountAmount;

      appliedDiscounts.push({
        id: discount.id,
        amount: discountAmount,
      });
    }

    const totalDiscount = originalAmount - currentAmount;

    return {
      totalDiscount,
      finalAmount: currentAmount,
      appliedDiscounts,
    };
  }

  /**
   * Check if discounts can stack
   */
  canStack(discounts: Discount[]): boolean {
    const nonStackable = discounts.filter(d => !d.stackable);
    return nonStackable.length <= 1;
  }

  /**
   * Get best combination
   */
  getBestCombination(
    originalAmount: number,
    discounts: Discount[]
  ): Discount[] {
    const combinations = this.generateCombinations(discounts);
    let bestDiscount = 0;
    let bestCombination: Discount[] = [];

    for (const combo of combinations) {
      if (!this.canStack(combo)) continue;

      const result = this.calculate(originalAmount, combo);
      if (result.totalDiscount > bestDiscount) {
        bestDiscount = result.totalDiscount;
        bestCombination = combo;
      }
    }

    return bestCombination;
  }

  /**
   * Generate all possible combinations
   */
  private generateCombinations(discounts: Discount[]): Discount[][] {
    const combinations: Discount[][] = [];

    for (let i = 1; i < (1 << discounts.length); i++) {
      const combo: Discount[] = [];
      for (let j = 0; j < discounts.length; j++) {
        if (i & (1 << j)) {
          combo.push(discounts[j]);
        }
      }
      combinations.push(combo);
    }

    return combinations;
  }
}

export default DiscountStacking;
