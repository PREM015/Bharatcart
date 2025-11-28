/**
 * Content Variants Manager
 * Purpose: Manage personalized content variations
 * Description: Content creation, variant testing, dynamic content
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface ContentVariant {
  id: string;
  content_group_id: string;
  name: string;
  type: 'text' | 'image' | 'html' | 'json';
  content: any;
  targeting_rules?: string[];
  priority: number;
  enabled: boolean;
  created_at: Date;
}

export interface ContentGroup {
  id: string;
  name: string;
  description: string;
  slot: string; // Where content appears (e.g., 'hero_banner', 'product_card')
  variants: ContentVariant[];
  default_variant_id: string;
  created_at: Date;
}

export interface ContentSelection {
  content_group_id: string;
  variant_id: string;
  variant_name: string;
  content: any;
  reason: string;
}

export class ContentVariantsManager {
  /**
   * Create content group
   */
  async createContentGroup(
    name: string,
    description: string,
    slot: string
  ): Promise<ContentGroup> {
    logger.info('Creating content group', { name, slot });

    const group = await prisma.contentGroup.create({
      data: {
        name,
        description,
        slot,
        created_at: new Date(),
      },
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      slot: group.slot,
      variants: [],
      default_variant_id: '',
      created_at: group.created_at,
    };
  }

  /**
   * Create content variant
   */
  async createVariant(variant: Omit<ContentVariant, 'id' | 'created_at'>): Promise<ContentVariant> {
    logger.info('Creating content variant', {
      group_id: variant.content_group_id,
      name: variant.name,
    });

    const created = await prisma.contentVariant.create({
      data: {
        content_group_id: variant.content_group_id,
        name: variant.name,
        type: variant.type,
        content: JSON.stringify(variant.content),
        targeting_rules: variant.targeting_rules ? JSON.stringify(variant.targeting_rules) : null,
        priority: variant.priority,
        enabled: variant.enabled,
        created_at: new Date(),
      },
    });

    return this.mapToVariant(created);
  }

  /**
   * Select content variant for user
   */
  async selectVariant(
    contentGroupId: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<ContentSelection> {
    logger.info('Selecting content variant', {
      group_id: contentGroupId,
      user_id: userId,
    });

    // Get content group and variants
    const group = await this.getContentGroup(contentGroupId);

    if (!group) {
      throw new Error('Content group not found');
    }

    // Filter enabled variants
    const enabledVariants = group.variants.filter(v => v.enabled);

    if (enabledVariants.length === 0) {
      throw new Error('No enabled variants found');
    }

    // Evaluate targeting rules
    let selectedVariant: ContentVariant | null = null;
    let selectionReason = 'default';

    // Sort by priority (higher first)
    enabledVariants.sort((a, b) => b.priority - a.priority);

    for (const variant of enabledVariants) {
      if (variant.targeting_rules && variant.targeting_rules.length > 0) {
        // Check if user matches targeting rules
        const matches = await this.evaluateTargetingRules(
          variant.targeting_rules,
          userId,
          context
        );

        if (matches) {
          selectedVariant = variant;
          selectionReason = 'targeted';
          break;
        }
      }
    }

    // Fall back to default variant
    if (!selectedVariant) {
      selectedVariant =
        enabledVariants.find(v => v.id === group.default_variant_id) ||
        enabledVariants[0];
      selectionReason = 'default';
    }

    // Track selection
    await this.trackVariantSelection(
      contentGroupId,
      selectedVariant.id,
      userId,
      selectionReason
    );

    return {
      content_group_id: contentGroupId,
      variant_id: selectedVariant.id,
      variant_name: selectedVariant.name,
      content: selectedVariant.content,
      reason: selectionReason,
    };
  }

  /**
   * Get content group
   */
  private async getContentGroup(groupId: string): Promise<ContentGroup | null> {
    const group = await prisma.contentGroup.findUnique({
      where: { id: groupId },
      include: {
        variants: true,
      },
    });

    if (!group) {
      return null;
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      slot: group.slot,
      variants: group.variants.map(v => this.mapToVariant(v)),
      default_variant_id: group.default_variant_id || '',
      created_at: group.created_at,
    };
  }

  /**
   * Evaluate targeting rules
   */
  private async evaluateTargetingRules(
    ruleIds: string[],
    userId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    // Get personalization rules
    const rules = await prisma.personalizationRule.findMany({
      where: {
        id: { in: ruleIds },
        enabled: true,
      },
    });

    // All rules must match (AND logic)
    // Implementation would integrate with PersonalizationTargetingEngine

    return true; // Placeholder
  }

  /**
   * Track variant selection
   */
  private async trackVariantSelection(
    groupId: string,
    variantId: string,
    userId?: string,
    reason?: string
  ): Promise<void> {
    await prisma.contentVariantImpression.create({
      data: {
        content_group_id: groupId,
        variant_id: variantId,
        user_id: userId,
        reason,
        created_at: new Date(),
      },
    });
  }

  /**
   * Get variant performance
   */
  async getVariantPerformance(variantId: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversion_rate: number;
  }> {
    const impressions = await prisma.contentVariantImpression.count({
      where: { variant_id: variantId },
    });

    const clicks = await prisma.contentVariantClick.count({
      where: { variant_id: variantId },
    });

    const conversions = await prisma.contentVariantConversion.count({
      where: { variant_id: variantId },
    });

    return {
      impressions,
      clicks,
      conversions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      conversion_rate: impressions > 0 ? conversions / impressions : 0,
    };
  }

  /**
   * A/B test content variants
   */
  async createABTest(
    groupId: string,
    variantIds: string[],
    trafficSplit: number[] = []
  ): Promise<void> {
    logger.info('Creating A/B test for content group', {
      group_id: groupId,
      variants: variantIds.length,
    });

    // Equal split if not specified
    const split =
      trafficSplit.length === variantIds.length
        ? trafficSplit
        : variantIds.map(() => 100 / variantIds.length);

    // Update variant priorities based on traffic split
    for (let i = 0; i < variantIds.length; i++) {
      await prisma.contentVariant.update({
        where: { id: variantIds[i] },
        data: {
          priority: Math.round(split[i]),
        },
      });
    }
  }

  /**
   * Map database record to ContentVariant
   */
  private mapToVariant(record: any): ContentVariant {
    return {
      id: record.id,
      content_group_id: record.content_group_id,
      name: record.name,
      type: record.type,
      content: JSON.parse(record.content),
      targeting_rules: record.targeting_rules ? JSON.parse(record.targeting_rules) : undefined,
      priority: record.priority,
      enabled: record.enabled,
      created_at: record.created_at,
    };
  }

  /**
   * Clone variant
   */
  async cloneVariant(variantId: string, newName: string): Promise<ContentVariant> {
    const original = await prisma.contentVariant.findUnique({
      where: { id: variantId },
    });

    if (!original) {
      throw new Error('Variant not found');
    }

    return this.createVariant({
      content_group_id: original.content_group_id,
      name: newName,
      type: original.type as any,
      content: JSON.parse(original.content),
      targeting_rules: original.targeting_rules ? JSON.parse(original.targeting_rules) : undefined,
      priority: original.priority,
      enabled: false, // Start disabled
    });
  }

  /**
   * Bulk update variants
   */
  async bulkUpdateVariants(
    variantIds: string[],
    updates: Partial<ContentVariant>
  ): Promise<void> {
    logger.info('Bulk updating variants', { count: variantIds.length });

    await prisma.contentVariant.updateMany({
      where: { id: { in: variantIds } },
      data: {
        enabled: updates.enabled,
        priority: updates.priority,
        content: updates.content ? JSON.stringify(updates.content) : undefined,
      },
    });
  }
}

export default ContentVariantsManager;
