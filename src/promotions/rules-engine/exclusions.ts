/**
 * Promotion Exclusions
 * Purpose: Manage product/category exclusions from promotions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ExclusionRule {
  type: 'product' | 'category' | 'brand' | 'tag';
  ids: number[];
  reason?: string;
}

export class PromotionExclusions {
  /**
   * Check if product is excluded
   */
  async isExcluded(
    promotionId: number,
    productId: number
  ): Promise<{ excluded: boolean; reason?: string }> {
    const exclusions = await this.getExclusions(promotionId);

    // Check direct product exclusion
    const productExclusion = exclusions.find(e => e.type === 'product');
    if (productExclusion?.ids.includes(productId)) {
      return { excluded: true, reason: productExclusion.reason };
    }

    // Check category exclusion
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { category_id: true, brand_id: true },
    });

    if (product) {
      const categoryExclusion = exclusions.find(e => e.type === 'category');
      if (categoryExclusion?.ids.includes(product.category_id)) {
        return { excluded: true, reason: categoryExclusion.reason };
      }

      const brandExclusion = exclusions.find(e => e.type === 'brand');
      if (product.brand_id && brandExclusion?.ids.includes(product.brand_id)) {
        return { excluded: true, reason: brandExclusion.reason };
      }
    }

    return { excluded: false };
  }

  /**
   * Add exclusion
   */
  async addExclusion(promotionId: number, rule: ExclusionRule): Promise<void> {
    logger.info('Adding exclusion', { promotionId, rule });

    await prisma.promotionExclusion.create({
      data: {
        promotion_id: promotionId,
        type: rule.type,
        excluded_ids: JSON.stringify(rule.ids),
        reason: rule.reason,
        created_at: new Date(),
      },
    });
  }

  /**
   * Get all exclusions for promotion
   */
  private async getExclusions(promotionId: number): Promise<ExclusionRule[]> {
    const exclusions = await prisma.promotionExclusion.findMany({
      where: { promotion_id: promotionId },
    });

    return exclusions.map(e => ({
      type: e.type as any,
      ids: JSON.parse(e.excluded_ids || '[]'),
      reason: e.reason || undefined,
    }));
  }

  /**
   * Remove exclusion
   */
  async removeExclusion(exclusionId: number): Promise<void> {
    await prisma.promotionExclusion.delete({
      where: { id: exclusionId },
    });

    logger.info('Exclusion removed', { exclusionId });
  }

  /**
   * Filter eligible products
   */
  async filterEligibleProducts(
    promotionId: number,
    productIds: number[]
  ): Promise<number[]> {
    const eligible: number[] = [];

    for (const productId of productIds) {
      const { excluded } = await this.isExcluded(promotionId, productId);
      if (!excluded) {
        eligible.push(productId);
      }
    }

    return eligible;
  }
}

export default PromotionExclusions;
