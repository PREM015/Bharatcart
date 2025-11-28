/**
 * Personalized Search Ranking
 * Purpose: Rerank search results based on user behavior and preferences
 * Description: User history analysis, collaborative filtering, behavioral scoring
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface UserBehavior {
  viewed_products: number[];
  purchased_products: number[];
  clicked_categories: number[];
  preferred_brands: number[];
  price_range?: { min: number; max: number };
  average_rating_preference?: number;
}

export class PersonalizedRankingEngine {
  async getUserBehavior(userId: number): Promise<UserBehavior> {
    const [viewedProducts, purchases, clickedCategories] = await Promise.all([
      this.getViewedProducts(userId),
      this.getPurchasedProducts(userId),
      this.getClickedCategories(userId),
    ]);

    const preferredBrands = await this.getPreferredBrands(userId);
    const priceRange = await this.getTypicalPriceRange(userId);

    return {
      viewed_products: viewedProducts,
      purchased_products: purchases,
      clicked_categories: clickedCategories,
      preferred_brands: preferredBrands,
      price_range: priceRange,
    };
  }

  async rerankResults(userId: number, results: any[]): Promise<any[]> {
    const behavior = await this.getUserBehavior(userId);

    return results.map(result => {
      let personalizedScore = result._score || 0;

      // Boost previously viewed
      if (behavior.viewed_products.includes(parseInt(result.id))) {
        personalizedScore *= 1.2;
      }

      // Boost preferred categories
      const categoryIds = result.category_ids || [];
      if (categoryIds.some((id: string) => behavior.clicked_categories.includes(parseInt(id)))) {
        personalizedScore *= 1.3;
      }

      // Boost preferred brands
      if (result.brand_id && behavior.preferred_brands.includes(parseInt(result.brand_id))) {
        personalizedScore *= 1.5;
      }

      // Boost products in price range
      if (behavior.price_range && result.price >= behavior.price_range.min && result.price <= behavior.price_range.max) {
        personalizedScore *= 1.2;
      }

      return { ...result, _score: personalizedScore, _personalized: true };
    }).sort((a, b) => b._score - a._score);
  }

  private async getViewedProducts(userId: number): Promise<number[]> {
    const views = await prisma.productView.findMany({
      where: { user_id: userId },
      orderBy: { viewed_at: 'desc' },
      take: 50,
      select: { product_id: true },
    });
    return views.map(v => v.product_id);
  }

  private async getPurchasedProducts(userId: number): Promise<number[]> {
    const orders = await prisma.order.findMany({
      where: { user_id: userId },
      include: { items: { select: { product_id: true } } },
    });
    const productIds = new Set<number>();
    orders.forEach(order => order.items.forEach(item => productIds.add(item.product_id)));
    return Array.from(productIds);
  }

  private async getClickedCategories(userId: number): Promise<number[]> {
    const clicks = await prisma.categoryClick.findMany({
      where: { user_id: userId },
      orderBy: { clicked_at: 'desc' },
      take: 20,
      select: { category_id: true },
    });
    return clicks.map(c => c.category_id);
  }

  private async getPreferredBrands(userId: number): Promise<number[]> {
    const purchases = await this.getPurchasedProducts(userId);
    const products = await prisma.product.findMany({
      where: { id: { in: purchases } },
      select: { brand_id: true },
    });

    const brandCounts = new Map<number, number>();
    products.forEach(p => {
      if (p.brand_id) {
        brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) || 0) + 1);
      }
    });

    return Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brandId]) => brandId);
  }

  private async getTypicalPriceRange(userId: number): Promise<{ min: number; max: number } | undefined> {
    const purchases = await this.getPurchasedProducts(userId);
    if (purchases.length === 0) return undefined;

    const products = await prisma.product.findMany({
      where: { id: { in: purchases } },
      select: { price: true },
    });

    const prices = products.map(p => p.price / 100);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length);

    return {
      min: Math.max(0, avg - stdDev),
      max: avg + stdDev,
    };
  }

  async trackSearchClick(userId: number, query: string, productId: number, position: number): Promise<void> {
    await prisma.searchClick.create({
      data: {
        user_id: userId,
        query,
        product_id: productId,
        position,
        clicked_at: new Date(),
      },
    });
  }
}

export default PersonalizedRankingEngine;
