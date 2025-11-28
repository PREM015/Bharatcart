/**
 * Fuzzy Search Builder
 * Purpose: Configure typo-tolerant and fuzzy search options
 * Description: Fine-tune search behavior for better user experience
 * 
 * Features:
 * - Typo tolerance configuration
 * - Prefix matching
 * - Token dropping
 * - Phonetic matching
 * - Synonym support
 * - Custom search strictness levels
 * 
 * Search Modes:
 * - Strict: No typos, exact matches only
 * - Normal: 1-2 typos tolerated
 * - Lenient: Maximum flexibility
 * - Autocomplete: Optimized for suggestions
 * 
 * @example
 * ```typescript
 * // Lenient search for "computr" finds "computer"
 * const fuzzy = FuzzySearchBuilder.lenient();
 * const params = fuzzy.build();
 * 
 * // Strict search - no typos
 * const strict = FuzzySearchBuilder.strict();
 * ```
 */

import { logger } from '@/lib/logger';

export interface FuzzySearchOptions {
  typoTolerance?: boolean;
  numTypos?: number;
  prefixMatching?: boolean;
  dropTokens?: number;
  dropTokensThreshold?: number;
  typoTokensThreshold?: number;
  phonetic?: boolean;
  synonyms?: boolean;
  splitJoinTokens?: boolean;
}

export interface FuzzySearchParams {
  num_typos?: number | string;
  prefix?: boolean | string;
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  enable_synonyms?: boolean;
  split_join_tokens?: 'off' | 'fallback' | 'always';
}

export class FuzzySearchBuilder {
  private options: FuzzySearchOptions = {
    typoTolerance: true,
    numTypos: 2,
    prefixMatching: true,
    dropTokens: 1,
    dropTokensThreshold: 1,
    typoTokensThreshold: 1,
    phonetic: false,
    synonyms: true,
    splitJoinTokens: false,
  };

  /**
   * Enable/disable typo tolerance
   * 
   * @param enabled - Whether to tolerate typos
   * @param numTypos - Number of typos (0-2)
   * 
   * @example
   * ```typescript
   * builder.typoTolerance(true, 2); // Allow up to 2 typos
   * ```
   */
  typoTolerance(enabled: boolean, numTypos: number = 2): this {
    this.options.typoTolerance = enabled;
    this.options.numTypos = Math.max(0, Math.min(2, numTypos));
    return this;
  }

  /**
   * Enable/disable prefix matching
   * Useful for autocomplete/search-as-you-type
   * 
   * @example
   * ```typescript
   * builder.prefixMatching(true); // "lapt" matches "laptop"
   * ```
   */
  prefixMatching(enabled: boolean): this {
    this.options.prefixMatching = enabled;
    return this;
  }

  /**
   * Set token dropping threshold
   * Allows dropping query words to get more results
   * 
   * @param threshold - Number of tokens that can be dropped
   * 
   * @example
   * ```typescript
   * builder.dropTokens(2); // Can drop up to 2 words
   * ```
   */
  dropTokens(threshold: number): this {
    this.options.dropTokensThreshold = Math.max(0, threshold);
    return this;
  }

  /**
   * Enable phonetic matching
   * Matches based on pronunciation
   */
  phonetic(enabled: boolean): this {
    this.options.phonetic = enabled;
    return this;
  }

  /**
   * Enable synonym matching
   */
  synonyms(enabled: boolean): this {
    this.options.synonyms = enabled;
    return this;
  }

  /**
   * Enable split/join tokens
   * "ecommerce" <-> "e-commerce" <-> "e commerce"
   */
  splitJoinTokens(mode: 'off' | 'fallback' | 'always'): this {
    this.options.splitJoinTokens = mode !== 'off';
    return this;
  }

  /**
   * Build fuzzy search parameters
   */
  build(): FuzzySearchParams {
    const params: FuzzySearchParams = {};

    // Typo tolerance
    if (this.options.typoTolerance) {
      params.num_typos = this.options.numTypos || 2;
    } else {
      params.num_typos = 0;
    }

    // Prefix matching
    params.prefix = this.options.prefixMatching !== false;

    // Token dropping
    if (this.options.dropTokensThreshold !== undefined) {
      params.drop_tokens_threshold = this.options.dropTokensThreshold;
    }

    // Typo tokens threshold
    if (this.options.typoTokensThreshold !== undefined) {
      params.typo_tokens_threshold = this.options.typoTokensThreshold;
    }

    // Synonyms
    params.enable_synonyms = this.options.synonyms !== false;

    // Split/join tokens
    if (this.options.splitJoinTokens) {
      params.split_join_tokens = 'fallback';
    }

    return params;
  }

  /**
   * Create strict search (exact matches only)
   */
  static strict(): FuzzySearchBuilder {
    const builder = new FuzzySearchBuilder();
    return builder
      .typoTolerance(false, 0)
      .prefixMatching(false)
      .dropTokens(0)
      .synonyms(false);
  }

  /**
   * Create normal search (default behavior)
   */
  static normal(): FuzzySearchBuilder {
    return new FuzzySearchBuilder();
  }

  /**
   * Create lenient search (maximum flexibility)
   */
  static lenient(): FuzzySearchBuilder {
    const builder = new FuzzySearchBuilder();
    return builder
      .typoTolerance(true, 2)
      .prefixMatching(true)
      .dropTokens(2)
      .phonetic(true)
      .synonyms(true)
      .splitJoinTokens('always');
  }

  /**
   * Create autocomplete optimized search
   */
  static autocomplete(): FuzzySearchBuilder {
    const builder = new FuzzySearchBuilder();
    return builder
      .typoTolerance(true, 1)
      .prefixMatching(true)
      .dropTokens(0)
      .synonyms(false);
  }
}

export default FuzzySearchBuilder;
