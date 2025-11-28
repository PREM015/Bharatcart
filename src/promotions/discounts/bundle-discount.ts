/**
 * Bundle Discount
 * Purpose: Discount when buying specific product combinations
 */

import { logger } from '@/lib/logger';

export interface BundleRule {
  requiredProducts: Array<{ productId: number; quantity: number }>;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxApplications?: number;
}

export class BundleDiscount {
  /**
   * Calculate bundle discount
   */
  calculate(
    items: Array<{ productId: number; quantity: number; price: number }>,
    rule: BundleRule
  ): number {
    logger.info('Calculating bundle discount', { rule });

    const bundlesAvailable = this.countAvailableBundles(items, rule);
    const applicableBundles = rule.maxApplications
      ? Math.min(bundlesAvailable, rule.maxApplications)
      : bundlesAvailable;

    if (applicableBundles === 0) return 0;

    const bundleValue = this.calculateBundleValue(items, rule);
    
    let discount = 0;
    if (rule.discountType === 'percentage') {
      discount = (bundleValue * rule.discountValue) / 100;
    } else {
      discount = rule.discountValue;
    }

    return (discount * applicableBundles) / 100;
  }

  /**
   * Count how many complete bundles can be formed
   */
  private countAvailableBundles(
    items: Array<{ productId: number; quantity: number }>,
    rule: BundleRule
  ): number {
    const itemMap = new Map(items.map(i => [i.productId, i.quantity]));

    let minBundles = Infinity;

    for (const required of rule.requiredProducts) {
      const available = itemMap.get(required.productId) || 0;
      const possibleBundles = Math.floor(available / required.quantity);
      minBundles = Math.min(minBundles, possibleBundles);
    }

    return minBundles === Infinity ? 0 : minBundles;
  }

  /**
   * Calculate total value of one bundle
   */
  private calculateBundleValue(
    items: Array<{ productId: number; quantity: number; price: number }>,
    rule: BundleRule
  ): number {
    let total = 0;

    for (const required of rule.requiredProducts) {
      const item = items.find(i => i.productId === required.productId);
      if (item) {
        total += item.price * required.quantity;
      }
    }

    return total;
  }
}

export default BundleDiscount;
