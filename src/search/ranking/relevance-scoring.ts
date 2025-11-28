/**
 * Relevance Scoring Engine
 * Purpose: Calculate and boost search result relevance
 * Description: Multi-factor scoring with customizable weights
 * 
 * Scoring Factors:
 * - Text Match: How well query matches document
 * - Exact Match: Exact phrase/word matches
 * - Popularity: Product views, sales, ratings
 * - Recency: Newer products score higher
 * - Rating: Customer ratings
 * - Price: Inverse scoring (lower = better)
 * - Availability: In-stock items score higher
 * - Click-through Rate: Historical performance
 * 
 * Algorithms Supported:
 * - TF-IDF (Term Frequency-Inverse Document Frequency)
 * - BM25 (Best Matching 25)
 * - Custom weighted scoring
 * 
 * @example
 * ```typescript
 * const scorer = new RelevanceScoringEngine();
 * scorer.setWeights({
 *   textMatch: 2.0,
 *   popularity: 0.8,
 *   rating: 0.5
 * });
 * 
 * const score = scorer.calculateScore(query, document, factors);
 * ```
 */

import { logger } from '@/lib/logger';

export interface ScoringFactors {
  textMatch?: number;
  exactMatch?: number;
  popularity?: number;
  recency?: number;
  rating?: number;
  price?: number;
  availability?: number;
  ctr?: number; // Click-through rate
}

export interface ScoringWeights {
  textMatch: number;
  exactMatch: number;
  popularity: number;
  recency: number;
  rating: number;
  price: number;
  availability: number;
  ctr: number;
}

export interface ScoringConfig {
  weights?: Partial<ScoringWeights>;
  algorithm?: 'weighted' | 'bm25' | 'tfidf';
  normalizeScores?: boolean;
}

export class RelevanceScoringEngine {
  private weights: ScoringWeights = {
    textMatch: 1.0,
    exactMatch: 2.0,
    popularity: 0.5,
    recency: 0.3,
    rating: 0.4,
    price: 0.2,
    availability: 0.8,
    ctr: 0.6,
  };

  private algorithm: 'weighted' | 'bm25' | 'tfidf' = 'weighted';
  private normalizeScores: boolean = true;

  constructor(config?: ScoringConfig) {
    if (config?.weights) {
      this.setWeights(config.weights);
    }
    if (config?.algorithm) {
      this.algorithm = config.algorithm;
    }
    if (config?.normalizeScores !== undefined) {
      this.normalizeScores = config.normalizeScores;
    }
  }

  /**
   * Set scoring weights
   */
  setWeights(weights: Partial<ScoringWeights>): this {
    this.weights = { ...this.weights, ...weights };
    return this;
  }

  /**
   * Calculate relevance score
   */
  calculateScore(
    query: string,
    document: any,
    factors: Partial<ScoringFactors>
  ): number {
    let score = 0;

    // Text match score
    if (factors.textMatch !== undefined) {
      score += this.normalizeScore(factors.textMatch, 0, 1) * this.weights.textMatch;
    }

    // Exact match boost
    if (factors.exactMatch !== undefined) {
      score += this.normalizeScore(factors.exactMatch, 0, 1) * this.weights.exactMatch;
    }

    // Popularity score
    if (factors.popularity !== undefined) {
      score += this.normalizeScore(factors.popularity, 0, 1000) * this.weights.popularity;
    }

    // Recency score
    if (factors.recency !== undefined) {
      score += this.normalizeScore(factors.recency, 0, 365) * this.weights.recency;
    }

    // Rating score
    if (factors.rating !== undefined) {
      score += this.normalizeScore(factors.rating, 0, 5) * this.weights.rating;
    }

    // Price score (inverse - lower is better)
    if (factors.price !== undefined) {
      const priceScore = 1 - this.normalizeScore(factors.price, 0, 1000);
      score += priceScore * this.weights.price;
    }

    // Availability boost
    if (factors.availability !== undefined) {
      score += factors.availability * this.weights.availability;
    }

    // Click-through rate
    if (factors.ctr !== undefined) {
      score += this.normalizeScore(factors.ctr, 0, 1) * this.weights.ctr;
    }

    return score;
  }

  /**
   * Normalize score to 0-1 range
   */
  private normalizeScore(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate text match score using term frequency
   */
  calculateTextMatchScore(query: string, text: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    const textTerms = textLower.split(/\s+/);

    let matchCount = 0;
    let exactMatchCount = 0;
    let positionScore = 0;

    for (let i = 0; i < queryTerms.length; i++) {
      const term = queryTerms[i];

      if (textLower.includes(term)) {
        matchCount++;

        // Check for exact word boundary match
        const regex = new RegExp(`\b${term}\b`, 'i');
        if (regex.test(text)) {
          exactMatchCount++;

          // Position scoring (earlier = better)
          const position = textTerms.indexOf(term);
          if (position !== -1) {
            positionScore += 1 / (position + 1);
          }
        }
      }
    }

    const matchRatio = matchCount / queryTerms.length;
    const exactMatchRatio = exactMatchCount / queryTerms.length;
    const avgPositionScore = positionScore / queryTerms.length;

    // Weighted combination
    return (
      matchRatio * 0.4 +
      exactMatchRatio * 0.4 +
      avgPositionScore * 0.2
    );
  }

  /**
   * Calculate BM25 score
   * 
   * BM25 is a ranking function used by search engines to estimate
   * relevance of documents to a search query
   * 
   * @param query - Search query
   * @param document - Document text
   * @param avgDocLength - Average document length in corpus
   * @param k1 - Term frequency saturation parameter (default: 1.2)
   * @param b - Length normalization parameter (default: 0.75)
   */
  calculateBM25(
    query: string,
    document: string,
    avgDocLength: number,
    k1: number = 1.2,
    b: number = 0.75
  ): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const docTerms = document.toLowerCase().split(/\s+/);
    const docLength = docTerms.length;

    let score = 0;

    for (const term of queryTerms) {
      // Term frequency in document
      const termFreq = docTerms.filter(t => t === term).length;

      if (termFreq > 0) {
        // BM25 formula
        const numerator = termFreq * (k1 + 1);
        const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));

        // IDF approximation (simplified)
        const idf = Math.log(1 + (avgDocLength - termFreq + 0.5) / (termFreq + 0.5));

        score += (numerator / denominator) * idf;
      }
    }

    return score;
  }

  /**
   * Calculate TF-IDF score
   * 
   * @param term - Search term
   * @param document - Document text
   * @param corpusSize - Total number of documents
   * @param documentsWithTerm - Number of documents containing term
   */
  calculateTFIDF(
    term: string,
    document: string,
    corpusSize: number,
    documentsWithTerm: number
  ): number {
    const docTerms = document.toLowerCase().split(/\s+/);
    const termLower = term.toLowerCase();

    // Term Frequency
    const termCount = docTerms.filter(t => t === termLower).length;
    const tf = termCount / docTerms.length;

    // Inverse Document Frequency
    const idf = Math.log(corpusSize / (documentsWithTerm + 1));

    return tf * idf;
  }

  /**
   * Boost score based on field importance
   */
  applyFieldBoost(score: number, field: string): number {
    const fieldBoosts: Record<string, number> = {
      name: 3.0,
      title: 3.0,
      description: 1.0,
      tags: 2.0,
      category: 1.5,
      brand: 2.0,
      sku: 2.5,
    };

    return score * (fieldBoosts[field] || 1.0);
  }

  /**
   * Calculate popularity boost
   */
  calculatePopularityBoost(
    viewCount: number,
    salesCount: number,
    rating: number,
    reviewCount: number
  ): number {
    let boost = 1.0;

    // Views contribution
    boost += Math.log10(viewCount + 1) * 0.1;

    // Sales contribution (stronger weight)
    boost += Math.log10(salesCount + 1) * 0.3;

    // Rating contribution
    boost += (rating / 5) * 0.2;

    // Review count contribution
    boost += Math.log10(reviewCount + 1) * 0.1;

    return boost;
  }

  /**
   * Calculate recency boost
   * Newer products get higher boost
   */
  calculateRecencyBoost(createdAt: Date): number {
    const now = Date.now();
    const productAge = now - createdAt.getTime();
    const daysSinceCreation = productAge / (1000 * 60 * 60 * 24);

    if (daysSinceCreation <= 7) {
      return 1.5; // Very new
    } else if (daysSinceCreation <= 30) {
      return 1.3; // New
    } else if (daysSinceCreation <= 90) {
      return 1.1; // Recent
    } else if (daysSinceCreation <= 180) {
      return 1.05; // Somewhat recent
    }

    return 1.0; // Standard
  }

  /**
   * Apply personalization boost based on user history
   */
  applyPersonalizationBoost(
    baseScore: number,
    userPreferences: {
      viewedCategories?: string[];
      viewedBrands?: string[];
      priceRange?: { min: number; max: number };
    },
    product: {
      categoryId?: string;
      brandId?: string;
      price?: number;
    }
  ): number {
    let boost = 1.0;

    // Category preference
    if (
      userPreferences.viewedCategories &&
      product.categoryId &&
      userPreferences.viewedCategories.includes(product.categoryId)
    ) {
      boost += 0.3;
    }

    // Brand preference
    if (
      userPreferences.viewedBrands &&
      product.brandId &&
      userPreferences.viewedBrands.includes(product.brandId)
    ) {
      boost += 0.4;
    }

    // Price range preference
    if (userPreferences.priceRange && product.price) {
      if (
        product.price >= userPreferences.priceRange.min &&
        product.price <= userPreferences.priceRange.max
      ) {
        boost += 0.2;
      }
    }

    return baseScore * boost;
  }

  /**
   * Create custom scoring formula
   * Allows defining custom scoring logic
   */
  createCustomFormula(
    formula: (factors: ScoringFactors) => number
  ): (factors: ScoringFactors) => number {
    return (factors: ScoringFactors) => {
      try {
        return formula(factors);
      } catch (error) {
        logger.error('Custom scoring formula failed', { error });
        return 0;
      }
    };
  }

  /**
   * Combine multiple scores
   */
  combineScores(scores: number[], weights?: number[]): number {
    if (scores.length === 0) return 0;

    if (weights && weights.length === scores.length) {
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
      return weightedSum / totalWeight;
    }

    // Simple average if no weights
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Get scoring configuration
   */
  getConfig(): {
    weights: ScoringWeights;
    algorithm: string;
    normalizeScores: boolean;
  } {
    return {
      weights: { ...this.weights },
      algorithm: this.algorithm,
      normalizeScores: this.normalizeScores,
    };
  }
}

export default RelevanceScoringEngine;
