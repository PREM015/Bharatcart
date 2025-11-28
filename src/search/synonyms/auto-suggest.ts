/**
 * Auto-suggest Engine
 * Purpose: Provide search suggestions as user types
 * Description: Autocomplete, popular searches, trending queries
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TypesenseEngine } from '../engines/typesense';

export interface Suggestion {
  query: string;
  count: number;
  type: 'product' | 'category' | 'brand' | 'popular';
}

export class AutoSuggestEngine {
  private searchEngine: TypesenseEngine;

  constructor(searchEngine: TypesenseEngine) {
    this.searchEngine = searchEngine;
  }

  async getSuggestions(query: string, limit: number = 10): Promise<Suggestion[]> {
    if (query.length < 2) return this.getPopularSearches(limit);

    const [productSuggestions, categorySuggestions, brandSuggestions] = await Promise.all([
      this.getProductSuggestions(query, limit),
      this.getCategorySuggestions(query, limit),
      this.getBrandSuggestions(query, limit),
    ]);

    const all = [...productSuggestions, ...categorySuggestions, ...brandSuggestions];
    all.sort((a, b) => b.count - a.count);
    return all.slice(0, limit);
  }

  private async getProductSuggestions(query: string, limit: number): Promise<Suggestion[]> {
    const results = await this.searchEngine.search('products', query, {
      queryBy: 'name',
      perPage: limit,
    });

    return results.hits?.map((hit: any) => ({
      query: hit.document.name,
      count: hit.document.popularity_score || 0,
      type: 'product' as const,
    })) || [];
  }

  private async getCategorySuggestions(query: string, limit: number): Promise<Suggestion[]> {
    const results = await this.searchEngine.search('categories', query, {
      queryBy: 'name',
      perPage: limit,
    });

    return results.hits?.map((hit: any) => ({
      query: hit.document.name,
      count: hit.document.product_count || 0,
      type: 'category' as const,
    })) || [];
  }

  private async getBrandSuggestions(query: string, limit: number): Promise<Suggestion[]> {
    const results = await this.searchEngine.search('brands', query, {
      queryBy: 'name',
      perPage: limit,
    });

    return results.hits?.map((hit: any) => ({
      query: hit.document.name,
      count: hit.document.product_count || 0,
      type: 'brand' as const,
    })) || [];
  }

  async getPopularSearches(limit: number = 10): Promise<Suggestion[]> {
    const popular = await prisma.searchQuery.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    return popular.map(p => ({
      query: p.query,
      count: p._count.query,
      type: 'popular' as const,
    }));
  }

  async trackQuery(query: string, userId?: number): Promise<void> {
    await prisma.searchQuery.create({
      data: {
        query,
        user_id: userId,
        searched_at: new Date(),
      },
    });
  }

  async getTrendingSearches(limit: number = 10): Promise<Suggestion[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await prisma.searchQuery.groupBy({
      by: ['query'],
      where: { searched_at: { gte: yesterday } },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    return trending.map(t => ({
      query: t.query,
      count: t._count.query,
      type: 'popular' as const,
    }));
  }
}

export default AutoSuggestEngine;
