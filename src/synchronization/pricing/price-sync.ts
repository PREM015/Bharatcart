/**
 * Price Synchronization System
 * Purpose: Sync prices across all marketplace channels
 * Description: Multi-channel pricing with rules and automation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

interface PricingRule {
  id: number;
  name: string;
  type: 'MARKUP' | 'MARKDOWN' | 'FIXED' | 'DYNAMIC';
  value: number;
  channels?: string[];
  categories?: number[];
  minPrice?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

interface ChannelPrice {
  channel: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
}

export class PriceSync {
  /**
   * Sync prices to all channels
   */
  async syncAllPrices(): Promise<void> {
    logger.info('Starting price sync to all channels');

    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
        },
      });

      logger.info(`Syncing prices for ${products.length} products`);

      for (const product of products) {
        await this.syncProductPrice(product);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Price sync completed');
    } catch (error) {
      logger.error('Price sync failed', { error });
      throw error;
    }
  }

  /**
   * Sync price for single product
   */
  async syncProductPrice(product: any): Promise<void> {
    try {
      // Get active pricing rules
      const rules = await this.getApplicableRules(product);

      // Calculate channel-specific prices
      const channelPrices = await this.calculateChannelPrices(product, rules);

      // Update prices in database
      await this.updateProductPrices(product.id, channelPrices);

      // Sync to external channels
      await this.syncToChannels(product, channelPrices);

      logger.debug(`Synced prices for product ${product.sku}`, { channelPrices });
    } catch (error) {
      logger.error(`Failed to sync price for product ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Get applicable pricing rules
   */
  private async getApplicableRules(product: any): Promise<PricingRule[]> {
    const now = new Date();

    const rules = await prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
    });

    // Filter rules applicable to this product
    return rules.filter(rule => {
      // Check category
      if (rule.categories && rule.categories.length > 0) {
        if (!rule.categories.includes(product.categoryId)) {
          return false;
        }
      }

      // Check price range
      if (rule.minPrice && product.price < rule.minPrice) {
        return false;
      }
      if (rule.maxPrice && product.price > rule.maxPrice) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate channel-specific prices
   */
  private async calculateChannelPrices(
    product: any,
    rules: PricingRule[]
  ): Promise<ChannelPrice[]> {
    const basePrice = product.price / 100; // Convert from cents
    const channels = ['AMAZON', 'EBAY', 'ETSY', 'WALMART'];
    const channelPrices: ChannelPrice[] = [];

    for (const channel of channels) {
      // Find channel-specific rule
      const channelRule = rules.find(r => r.channels?.includes(channel));

      let finalPrice = basePrice;

      if (channelRule) {
        finalPrice = this.applyPricingRule(basePrice, channelRule);
      }

      // Apply channel-specific fees
      finalPrice = this.applyChannelFees(finalPrice, channel);

      // Round to 2 decimal places
      finalPrice = Math.round(finalPrice * 100) / 100;

      channelPrices.push({
        channel,
        price: Math.round(finalPrice * 100), // Store in cents
        compareAtPrice: product.compareAtPrice,
        currency: 'USD',
      });
    }

    return channelPrices;
  }

  /**
   * Apply pricing rule
   */
  private applyPricingRule(basePrice: number, rule: PricingRule): number {
    switch (rule.type) {
      case 'MARKUP':
        // Add percentage markup
        return basePrice * (1 + rule.value / 100);

      case 'MARKDOWN':
        // Subtract percentage markdown
        return basePrice * (1 - rule.value / 100);

      case 'FIXED':
        // Set fixed price
        return rule.value;

      case 'DYNAMIC':
        // Dynamic pricing (implement based on demand, competition, etc.)
        return this.calculateDynamicPrice(basePrice, rule);

      default:
        return basePrice;
    }
  }

  /**
   * Calculate dynamic price
   */
  private calculateDynamicPrice(basePrice: number, rule: PricingRule): number {
    // Implement dynamic pricing algorithm
    // This is a placeholder - real implementation would consider:
    // - Competitor prices
    // - Demand/sales velocity
    // - Inventory levels
    // - Time of day/season
    // - Historical data

    return basePrice * (1 + (Math.random() * 0.1 - 0.05)); // ±5% variation
  }

  /**
   * Apply channel-specific fees
   */
  private applyChannelFees(price: number, channel: string): number {
    const feeStructures: Record<string, number> = {
      AMAZON: 0.15, // 15% referral fee
      EBAY: 0.125, // 12.5% final value fee
      ETSY: 0.065, // 6.5% transaction fee
      WALMART: 0.15, // 15% referral fee
    };

    const fee = feeStructures[channel] || 0;

    // Adjust price to account for fees while maintaining margin
    return price / (1 - fee);
  }

  /**
   * Update product prices in database
   */
  private async updateProductPrices(
    productId: number,
    channelPrices: ChannelPrice[]
  ): Promise<void> {
    // Store channel-specific prices
    for (const channelPrice of channelPrices) {
      await prisma.channelPrice.upsert({
        where: {
          productId_channel: {
            productId,
            channel: channelPrice.channel,
          },
        },
        create: {
          productId,
          channel: channelPrice.channel,
          price: channelPrice.price,
          compareAtPrice: channelPrice.compareAtPrice,
          currency: channelPrice.currency,
        },
        update: {
          price: channelPrice.price,
          compareAtPrice: channelPrice.compareAtPrice,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Sync prices to external channels
   */
  private async syncToChannels(
    product: any,
    channelPrices: ChannelPrice[]
  ): Promise<void> {
    for (const channelPrice of channelPrices) {
      // Queue price update job
      await redis.lpush(
        'price:sync:queue',
        JSON.stringify({
          productId: product.id,
          sku: product.sku,
          channel: channelPrice.channel,
          price: channelPrice.price,
          compareAtPrice: channelPrice.compareAtPrice,
        })
      );
    }
  }

  /**
   * Create pricing rule
   */
  async createPricingRule(rule: Omit<PricingRule, 'id'>): Promise<PricingRule> {
    logger.info('Creating pricing rule', { rule });

    const created = await prisma.pricingRule.create({
      data: rule,
    });

    // Apply rule to existing products
    await this.applyRuleToProducts(created);

    return created;
  }

  /**
   * Apply rule to existing products
   */
  private async applyRuleToProducts(rule: PricingRule): Promise<void> {
    logger.info(`Applying pricing rule ${rule.id} to products`);

    const where: any = { isActive: true };

    if (rule.categories && rule.categories.length > 0) {
      where.categoryId = { in: rule.categories };
    }

    if (rule.minPrice || rule.maxPrice) {
      where.price = {};
      if (rule.minPrice) where.price.gte = rule.minPrice;
      if (rule.maxPrice) where.price.lte = rule.maxPrice;
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
    });

    logger.info(`Applying rule to ${products.length} products`);

    for (const product of products) {
      await this.syncProductPrice(product);
    }
  }

  /**
   * Get channel price for product
   */
  async getChannelPrice(productId: number, channel: string): Promise<ChannelPrice | null> {
    const channelPrice = await prisma.channelPrice.findUnique({
      where: {
        productId_channel: {
          productId,
          channel,
        },
      },
    });

    if (!channelPrice) return null;

    return {
      channel: channelPrice.channel,
      price: channelPrice.price,
      compareAtPrice: channelPrice.compareAtPrice || undefined,
      currency: channelPrice.currency,
    };
  }

  /**
   * Get all channel prices for product
   */
  async getAllChannelPrices(productId: number): Promise<ChannelPrice[]> {
    const channelPrices = await prisma.channelPrice.findMany({
      where: { productId },
    });

    return channelPrices.map(cp => ({
      channel: cp.channel,
      price: cp.price,
      compareAtPrice: cp.compareAtPrice || undefined,
      currency: cp.currency,
    }));
  }

  /**
   * Schedule price sync
   */
  async schedulePriceSync(
    productIds: number[],
    scheduledFor: Date
  ): Promise<void> {
    logger.info(`Scheduling price sync for ${productIds.length} products at ${scheduledFor}`);

    await redis.zadd(
      'price:sync:scheduled',
      scheduledFor.getTime(),
      JSON.stringify({ productIds, scheduledFor })
    );
  }

  /**
   * Process scheduled price syncs
   */
  async processScheduledSyncs(): Promise<void> {
    const now = Date.now();

    // Get all scheduled syncs that are due
    const scheduled = await redis.zrangebyscore(
      'price:sync:scheduled',
      0,
      now
    );

    for (const item of scheduled) {
      try {
        const { productIds } = JSON.parse(item);

        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: { category: true },
        });

        for (const product of products) {
          await this.syncProductPrice(product);
        }

        // Remove from scheduled
        await redis.zrem('price:sync:scheduled', item);
      } catch (error) {
        logger.error('Failed to process scheduled sync', { error });
      }
    }
  }

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 86400000);

    const priceChanges = await prisma.priceChangeLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        product: {
          select: { sku: true, name: true },
        },
      },
    });

    const analytics = {
      totalChanges: priceChanges.length,
      averageChange: 0,
      channelBreakdown: {} as Record<string, number>,
      categoryBreakdown: {} as Record<string, number>,
    };

    priceChanges.forEach(change => {
      // Calculate average change
      analytics.averageChange += Math.abs(change.newPrice - change.oldPrice);

      // Channel breakdown
      analytics.channelBreakdown[change.channel] =
        (analytics.channelBreakdown[change.channel] || 0) + 1;
    });

    if (priceChanges.length > 0) {
      analytics.averageChange /= priceChanges.length;
    }

    return analytics;
  }
}

/**
 * Scheduled price sync job
 */
export async function runPriceSync() {
  try {
    const priceSync = new PriceSync();

    // Process scheduled syncs
    await priceSync.processScheduledSyncs();

    // Sync all active products
    await priceSync.syncAllPrices();

    logger.info('Price sync job completed');
  } catch (error) {
    logger.error('Price sync job failed', { error });
    throw error;
  }
}

export default PriceSync;
