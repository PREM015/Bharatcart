/**
 * Competitor Pricing System
 * Purpose: Monitor and respond to competitor pricing
 * Description: Automated competitive pricing with rules engine
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

interface CompetitorSource {
  id: number;
  name: string;
  domain: string;
  selectors: {
    price: string;
    title: string;
    availability: string;
  };
  isActive: boolean;
}

interface CompetitorPrice {
  competitorId: number;
  competitorName: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  scrapedAt: Date;
}

interface PricingStrategy {
  type: 'MATCH' | 'UNDERCUT' | 'PREMIUM' | 'DYNAMIC';
  value: number; // Percentage or fixed amount
  minMargin: number; // Minimum profit margin %
  maxDiscount: number; // Maximum discount %
}

export class CompetitorPricing {
  private userAgent = 'Mozilla/5.0 (compatible; BharatCartBot/1.0)';

  /**
   * Monitor competitor prices for all products
   */
  async monitorAllPrices(): Promise<void> {
    logger.info('Starting competitor price monitoring');

    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          competitorMonitoringEnabled: true,
        },
        include: {
          competitorLinks: {
            where: { isActive: true },
            include: { competitor: true },
          },
        },
      });

      logger.info(`Monitoring ${products.length} products`);

      for (const product of products) {
        await this.monitorProductPrices(product);

        // Rate limiting to avoid being blocked
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info('Competitor price monitoring completed');
    } catch (error) {
      logger.error('Competitor price monitoring failed', { error });
      throw error;
    }
  }

  /**
   * Monitor prices for single product
   */
  async monitorProductPrices(product: any): Promise<void> {
    logger.info(`Monitoring competitor prices for ${product.sku}`);

    try {
      const competitorPrices: CompetitorPrice[] = [];

      for (const link of product.competitorLinks) {
        try {
          const price = await this.scrapeCompetitorPrice(
            link.url,
            link.competitor
          );

          if (price) {
            competitorPrices.push(price);

            // Save to database
            await this.saveCompetitorPrice(product.id, price);
          }
        } catch (error) {
          logger.error(`Failed to scrape ${link.competitor.name}`, { error });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Analyze and respond to competitor prices
      if (competitorPrices.length > 0) {
        await this.analyzeAndRespond(product, competitorPrices);
      }

      logger.info(`Found ${competitorPrices.length} competitor prices for ${product.sku}`);
    } catch (error) {
      logger.error(`Failed to monitor prices for ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Scrape competitor price from URL
   */
  private async scrapeCompetitorPrice(
    url: string,
    competitor: CompetitorSource
  ): Promise<CompetitorPrice | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Extract price
      const priceText = $(competitor.selectors.price).first().text().trim();
      const price = this.parsePrice(priceText);

      if (!price) {
        logger.warn(`Could not extract price from ${competitor.name}`);
        return null;
      }

      // Extract availability
      const availabilityText = $(competitor.selectors.availability)
        .first()
        .text()
        .trim()
        .toLowerCase();
      const inStock = !availabilityText.includes('out of stock');

      return {
        competitorId: competitor.id,
        competitorName: competitor.name,
        price,
        currency: 'USD',
        url,
        inStock,
        scrapedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to scrape ${url}`, { error });
      return null;
    }
  }

  /**
   * Parse price from text
   */
  private parsePrice(priceText: string): number | null {
    // Remove currency symbols and commas
    const cleaned = priceText.replace(/[$,₹€£]/g, '').trim();

    // Extract number
    const match = cleaned.match(/[\d.]+/);
    if (!match) return null;

    const price = parseFloat(match[0]);
    return isNaN(price) ? null : price;
  }

  /**
   * Save competitor price to database
   */
  private async saveCompetitorPrice(
    productId: number,
    competitorPrice: CompetitorPrice
  ): Promise<void> {
    await prisma.competitorPrice.create({
      data: {
        productId,
        competitorId: competitorPrice.competitorId,
        price: Math.round(competitorPrice.price * 100), // Store in cents
        currency: competitorPrice.currency,
        url: competitorPrice.url,
        inStock: competitorPrice.inStock,
        scrapedAt: competitorPrice.scrapedAt,
      },
    });
  }

  /**
   * Analyze competitor prices and respond
   */
  private async analyzeAndRespond(
    product: any,
    competitorPrices: CompetitorPrice[]
  ): Promise<void> {
    // Get pricing strategy
    const strategy = await this.getPricingStrategy(product);

    if (!strategy) {
      logger.info(`No pricing strategy for ${product.sku}`);
      return;
    }

    // Calculate competitive price
    const newPrice = this.calculateCompetitivePrice(
      product,
      competitorPrices,
      strategy
    );

    if (!newPrice) return;

    const currentPrice = product.price / 100;

    // Check if price change is significant
    const priceChange = Math.abs(newPrice - currentPrice) / currentPrice;

    if (priceChange < 0.01) {
      // Less than 1% change, skip
      logger.debug(`Price change too small for ${product.sku}`);
      return;
    }

    // Update price
    await this.updateProductPrice(product.id, newPrice, competitorPrices);

    logger.info(`Updated price for ${product.sku} from $${currentPrice} to $${newPrice}`);
  }

  /**
   * Get pricing strategy for product
   */
  private async getPricingStrategy(product: any): Promise<PricingStrategy | null> {
    const strategy = await prisma.pricingStrategy.findFirst({
      where: {
        OR: [
          { productId: product.id },
          { categoryId: product.categoryId },
          { isDefault: true },
        ],
        isActive: true,
      },
      orderBy: [
        { productId: 'desc' }, // Product-specific first
        { categoryId: 'desc' }, // Then category
        { isDefault: 'desc' }, // Finally default
      ],
    });

    return strategy;
  }

  /**
   * Calculate competitive price
   */
  private calculateCompetitivePrice(
    product: any,
    competitorPrices: CompetitorPrice[],
    strategy: PricingStrategy
  ): number | null {
    // Filter in-stock competitors
    const inStockPrices = competitorPrices
      .filter(cp => cp.inStock)
      .map(cp => cp.price)
      .sort((a, b) => a - b);

    if (inStockPrices.length === 0) return null;

    const lowestPrice = inStockPrices[0];
    const averagePrice = inStockPrices.reduce((sum, p) => sum + p, 0) / inStockPrices.length;

    let targetPrice: number;

    switch (strategy.type) {
      case 'MATCH':
        // Match lowest competitor price
        targetPrice = lowestPrice;
        break;

      case 'UNDERCUT':
        // Undercut lowest by percentage or fixed amount
        targetPrice = lowestPrice * (1 - strategy.value / 100);
        break;

      case 'PREMIUM':
        // Price above average by percentage
        targetPrice = averagePrice * (1 + strategy.value / 100);
        break;

      case 'DYNAMIC':
        // Dynamic pricing based on multiple factors
        targetPrice = this.calculateDynamicPrice(
          product,
          lowestPrice,
          averagePrice,
          strategy
        );
        break;

      default:
        return null;
    }

    // Apply constraints
    const costPrice = (product.costPrice || 0) / 100;
    const minPrice = costPrice * (1 + strategy.minMargin / 100);
    const currentPrice = product.price / 100;
    const maxDiscount = currentPrice * (1 - strategy.maxDiscount / 100);

    // Ensure minimum margin
    if (targetPrice < minPrice) {
      targetPrice = minPrice;
    }

    // Ensure maximum discount
    if (targetPrice < maxDiscount) {
      targetPrice = maxDiscount;
    }

    return Math.round(targetPrice * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate dynamic price
   */
  private calculateDynamicPrice(
    product: any,
    lowestPrice: number,
    averagePrice: number,
    strategy: PricingStrategy
  ): number {
    // Factors to consider:
    // 1. Competitor prices
    // 2. Inventory level
    // 3. Sales velocity
    // 4. Demand elasticity

    let targetPrice = averagePrice;

    // Adjust based on inventory
    const stockLevel = product.stock;
    if (stockLevel < 10) {
      // Low stock, increase price
      targetPrice *= 1.05;
    } else if (stockLevel > 100) {
      // High stock, decrease price
      targetPrice *= 0.95;
    }

    // Ensure within reasonable range
    if (targetPrice < lowestPrice * 0.9) {
      targetPrice = lowestPrice * 0.9;
    }
    if (targetPrice > averagePrice * 1.1) {
      targetPrice = averagePrice * 1.1;
    }

    return targetPrice;
  }

  /**
   * Update product price
   */
  private async updateProductPrice(
    productId: number,
    newPrice: number,
    competitorPrices: CompetitorPrice[]
  ): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true },
    });

    if (!product) return;

    const oldPrice = product.price;
    const newPriceInCents = Math.round(newPrice * 100);

    // Update price
    await prisma.product.update({
      where: { id: productId },
      data: {
        price: newPriceInCents,
        priceUpdatedAt: new Date(),
      },
    });

    // Log price change
    await prisma.priceChangeLog.create({
      data: {
        productId,
        oldPrice,
        newPrice: newPriceInCents,
        reason: 'COMPETITIVE_PRICING',
        competitorData: JSON.stringify(competitorPrices),
        channel: 'ALL',
      },
    });

    // Invalidate cache
    await redis.del(`product:${productId}`);
  }

  /**
   * Get competitor price history
   */
  async getCompetitorPriceHistory(
    productId: number,
    days: number = 30
  ): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 86400000);

    return await prisma.competitorPrice.findMany({
      where: {
        productId,
        scrapedAt: { gte: startDate },
      },
      include: {
        competitor: {
          select: { name: true },
        },
      },
      orderBy: { scrapedAt: 'desc' },
    });
  }

  /**
   * Get price comparison
   */
  async getPriceComparison(productId: number): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, name: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Get latest competitor prices
    const competitorPrices = await prisma.competitorPrice.findMany({
      where: { productId },
      orderBy: { scrapedAt: 'desc' },
      distinct: ['competitorId'],
      take: 5,
      include: {
        competitor: {
          select: { name: true },
        },
      },
    });

    const ourPrice = product.price / 100;
    const competitors = competitorPrices.map(cp => ({
      name: cp.competitor.name,
      price: cp.price / 100,
      difference: cp.price / 100 - ourPrice,
      percentageDifference: ((cp.price / 100 - ourPrice) / ourPrice) * 100,
      inStock: cp.inStock,
      url: cp.url,
    }));

    const lowestCompetitor = competitors.reduce((min, c) =>
      c.price < min.price ? c : min
    , competitors[0]);

    return {
      product: {
        name: product.name,
        ourPrice,
      },
      competitors,
      lowestCompetitor,
      competitivePosition:
        ourPrice <= lowestCompetitor?.price ? 'LOWEST' : 'HIGHER',
    };
  }

  /**
   * Add competitor tracking
   */
  async addCompetitorTracking(
    productId: number,
    competitorId: number,
    url: string
  ): Promise<void> {
    await prisma.competitorLink.create({
      data: {
        productId,
        competitorId,
        url,
        isActive: true,
      },
    });

    logger.info(`Added competitor tracking for product ${productId}`);
  }

  /**
   * Get pricing insights
   */
  async getPricingInsights(): Promise<any> {
    const recentChanges = await prisma.priceChangeLog.findMany({
      where: {
        reason: 'COMPETITIVE_PRICING',
        createdAt: { gte: new Date(Date.now() - 86400000 * 7) },
      },
      include: {
        product: {
          select: { sku: true, name: true },
        },
      },
    });

    const insights = {
      totalChanges: recentChanges.length,
      avgPriceIncrease: 0,
      avgPriceDecrease: 0,
      mostAdjustedProducts: [] as any[],
    };

    const productChangeCounts: Record<number, number> = {};
    let totalIncrease = 0;
    let totalDecrease = 0;
    let increaseCount = 0;
    let decreaseCount = 0;

    recentChanges.forEach(change => {
      const difference = change.newPrice - change.oldPrice;

      if (difference > 0) {
        totalIncrease += difference;
        increaseCount++;
      } else {
        totalDecrease += Math.abs(difference);
        decreaseCount++;
      }

      productChangeCounts[change.productId] =
        (productChangeCounts[change.productId] || 0) + 1;
    });

    insights.avgPriceIncrease = increaseCount > 0 ? totalIncrease / increaseCount / 100 : 0;
    insights.avgPriceDecrease = decreaseCount > 0 ? totalDecrease / decreaseCount / 100 : 0;

    // Get most adjusted products
    const sortedProducts = Object.entries(productChangeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [productId, count] of sortedProducts) {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        select: { sku: true, name: true },
      });

      insights.mostAdjustedProducts.push({
        ...product,
        adjustmentCount: count,
      });
    }

    return insights;
  }
}

/**
 * Scheduled competitor monitoring job
 */
export async function runCompetitorMonitoring() {
  try {
    const competitorPricing = new CompetitorPricing();
    await competitorPricing.monitorAllPrices();

    logger.info('Competitor monitoring job completed');
  } catch (error) {
    logger.error('Competitor monitoring job failed', { error });
    throw error;
  }
}

export default CompetitorPricing;
