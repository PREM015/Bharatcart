/**
 * Advanced Query Builder
 * Purpose: Build complex search queries with filters, facets, and sorting
 * Description: Fluent API for constructing sophisticated search queries
 * 
 * Features:
 * - Fluent/chainable API
 * - Type-safe query construction
 * - Multiple filter operators
 * - Faceted search support
 * - Multi-field sorting
 * - Pagination
 * - Query validation
 * - Performance optimization
 * 
 * Filter Operators:
 * - equals (=)
 * - not_equals (!=)
 * - greater_than (>)
 * - less_than (<)
 * - greater_than_or_equals (>=)
 * - less_than_or_equals (<=)
 * - in (value in array)
 * - not_in (value not in array)
 * - contains (substring match)
 * - range (between min and max)
 * 
 * @example
 * ```typescript
 * const query = new AdvancedQueryBuilder()
 *   .setQuery('laptop')
 *   .queryBy('name', 'description')
 *   .filter('price', '>=', 500)
 *   .filter('price', '<=', 1500)
 *   .inCategory('electronics')
 *   .inStock()
 *   .minRating(4.0)
 *   .facet('brand', 'category', 'price')
 *   .sortByPrice('asc')
 *   .paginate(1, 20)
 *   .build();
 * ```
 */

import { logger } from '@/lib/logger';

export interface SearchFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains' | 'range';
  value: any;
  value_end?: any; // For range operator
}

export interface SearchFacet {
  field: string;
  maxValues?: number;
  sort?: 'count' | 'value';
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryConfig {
  q: string;
  query_by: string;
  query_by_weights?: string;
  filter_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  sort_by?: string;
  page?: number;
  per_page?: number;
  prefix?: boolean;
  num_typos?: number;
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  group_by?: string;
  group_limit?: number;
  highlight_fields?: string;
  snippet_threshold?: number;
  limit_hits?: number;
  prioritize_exact_match?: boolean;
  enable_synonyms?: boolean;
}

export class AdvancedQueryBuilder {
  private query: string = '*';
  private filters: SearchFilter[] = [];
  private facets: SearchFacet[] = [];
  private sorts: SearchSort[] = [];
  private page: number = 1;
  private perPage: number = 20;
  private queryByFields: string[] = [];
  private queryByWeights: number[] = [];
  private options: Partial<QueryConfig> = {};

  /**
   * Set the search query text
   * 
   * @param query - Search query string (use '*' for all)
   * @returns this for chaining
   * 
   * @example
   * ```typescript
   * builder.setQuery('laptop gaming');
   * ```
   */
  setQuery(query: string): this {
    this.query = query || '*';
    return this;
  }

  /**
   * Set fields to search in with optional weights
   * 
   * @param fields - Field names to search
   * @param weights - Optional weights for each field (1-10)
   * 
   * @example
   * ```typescript
   * builder.queryBy(['name', 'description'], [3, 1]);
   * // Matches in 'name' are 3x more important than 'description'
   * ```
   */
  queryBy(fields: string | string[], weights?: number[]): this {
    this.queryByFields = Array.isArray(fields) ? fields : [fields];
    if (weights) {
      this.queryByWeights = weights;
    }
    return this;
  }

  /**
   * Add a filter condition
   * 
   * @param field - Field to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * 
   * @example
   * ```typescript
   * builder.filter('price', '>=', 100);
   * builder.filter('category', 'in', ['electronics', 'computers']);
   * ```
   */
  filter(field: string, operator: SearchFilter['operator'], value: any): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  /**
   * Add multiple filters at once
   */
  where(filters: SearchFilter[]): this {
    this.filters.push(...filters);
    return this;
  }

  /**
   * Filter by price range
   * 
   * @example
   * ```typescript
   * builder.priceRange(100, 500);
   * ```
   */
  priceRange(min: number, max: number): this {
    if (min > 0) {
      this.filter('price', '>=', min);
    }
    if (max > 0) {
      this.filter('price', '<=', max);
    }
    return this;
  }

  /**
   * Filter by exact price
   */
  priceEquals(price: number): this {
    this.filter('price', '=', price);
    return this;
  }

  /**
   * Filter by category
   * 
   * @param categoryId - Category ID or IDs
   */
  inCategory(categoryId: string | string[]): this {
    if (Array.isArray(categoryId)) {
      this.filter('category_ids', 'in', categoryId);
    } else {
      this.filter('category_ids', '=', categoryId);
    }
    return this;
  }

  /**
   * Filter by brand
   */
  byBrand(brandId: string | string[]): this {
    if (Array.isArray(brandId)) {
      this.filter('brand_id', 'in', brandId);
    } else {
      this.filter('brand_id', '=', brandId);
    }
    return this;
  }

  /**
   * Filter by tags
   */
  withTags(tags: string | string[]): this {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    this.filter('tags', 'in', tagArray);
    return this;
  }

  /**
   * Filter by in stock status
   */
  inStock(value: boolean = true): this {
    this.filter('in_stock', '=', value);
    return this;
  }

  /**
   * Filter by active status
   */
  isActive(value: boolean = true): this {
    this.filter('is_active', '=', value);
    return this;
  }

  /**
   * Filter by featured status
   */
  isFeatured(value: boolean = true): this {
    this.filter('is_featured', '=', value);
    return this;
  }

  /**
   * Filter by minimum rating
   */
  minRating(rating: number): this {
    this.filter('rating', '>=', rating);
    return this;
  }

  /**
   * Filter by minimum review count
   */
  minReviews(count: number): this {
    this.filter('review_count', '>=', count);
    return this;
  }

  /**
   * Filter by discount percentage
   */
  onSale(minDiscount: number = 1): this {
    this.filter('discount_percentage', '>=', minDiscount);
    return this;
  }

  /**
   * Filter by date range
   */
  createdBetween(startDate: Date, endDate: Date): this {
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.floor(endDate.getTime() / 1000);
    this.filter('created_at', '>=', start);
    this.filter('created_at', '<=', end);
    return this;
  }

  /**
   * Filter for new products (last N days)
   */
  newProducts(days: number = 30): this {
    const timestamp = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    this.filter('created_at', '>=', timestamp);
    return this;
  }

  /**
   * Add a facet for filtering UI
   * 
   * @param field - Field to facet on
   * @param maxValues - Maximum facet values to return
   * @param sort - How to sort facet values
   * 
   * @example
   * ```typescript
   * builder.facet('brand', 20, 'count');
   * builder.facet('price', 10, 'value');
   * ```
   */
  facet(field: string, maxValues?: number, sort?: 'count' | 'value'): this {
    this.facets.push({ field, maxValues, sort });
    return this;
  }

  /**
   * Add multiple facets
   */
  facets(...fields: string[]): this {
    fields.forEach(field => this.facet(field));
    return this;
  }

  /**
   * Add common e-commerce facets
   */
  commonFacets(): this {
    this.facet('category_names', 10);
    this.facet('brand_name', 20);
    this.facet('price', 10);
    this.facet('rating', 5);
    this.facet('in_stock', 2);
    this.facet('color', 15);
    this.facet('size', 15);
    return this;
  }

  /**
   * Add a sort order
   * 
   * @param field - Field to sort by
   * @param direction - Sort direction
   * 
   * @example
   * ```typescript
   * builder.sortBy('price', 'asc');
   * builder.sortBy('rating', 'desc');
   * ```
   */
  sortBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.sorts.push({ field, direction });
    return this;
  }

  /**
   * Clear all sorting (use relevance)
   */
  sortByRelevance(): this {
    this.sorts = [];
    return this;
  }

  /**
   * Sort by price
   */
  sortByPrice(direction: 'asc' | 'desc' = 'asc'): this {
    this.sortBy('price', direction);
    return this;
  }

  /**
   * Sort by popularity score
   */
  sortByPopularity(): this {
    this.sortBy('popularity_score', 'desc');
    return this;
  }

  /**
   * Sort by rating
   */
  sortByRating(): this {
    this.sortBy('rating', 'desc');
    return this;
  }

  /**
   * Sort by newest first
   */
  sortByNewest(): this {
    this.sortBy('created_at', 'desc');
    return this;
  }

  /**
   * Sort by best selling
   */
  sortByBestSelling(): this {
    this.sortBy('sales_count', 'desc');
    return this;
  }

  /**
   * Sort by most reviewed
   */
  sortByMostReviewed(): this {
    this.sortBy('review_count', 'desc');
    return this;
  }

  /**
   * Set pagination
   * 
   * @param page - Page number (1-based)
   * @param perPage - Items per page
   */
  paginate(page: number, perPage: number = 20): this {
    this.page = Math.max(1, page);
    this.perPage = Math.max(1, Math.min(250, perPage)); // Cap at 250
    return this;
  }

  /**
   * Set page size only
   */
  limit(count: number): this {
    this.perPage = Math.max(1, Math.min(250, count));
    return this;
  }

  /**
   * Enable prefix matching for autocomplete
   */
  enablePrefixSearch(enable: boolean = true): this {
    this.options.prefix = enable;
    return this;
  }

  /**
   * Set typo tolerance
   * 
   * @param numTypos - Number of typos to tolerate (0-2)
   */
  typoTolerance(numTypos: number): this {
    this.options.num_typos = Math.max(0, Math.min(2, numTypos));
    return this;
  }

  /**
   * Disable typo tolerance
   */
  strictMatch(): this {
    this.options.num_typos = 0;
    return this;
  }

  /**
   * Enable/disable synonyms
   */
  useSynonyms(enable: boolean = true): this {
    this.options.enable_synonyms = enable;
    return this;
  }

  /**
   * Prioritize exact matches
   */
  prioritizeExactMatch(enable: boolean = true): this {
    this.options.prioritize_exact_match = enable;
    return this;
  }

  /**
   * Set highlighting options
   */
  highlightFields(...fields: string[]): this {
    this.options.highlight_fields = fields.join(',');
    return this;
  }

  /**
   * Group results by field
   */
  groupBy(field: string, limit: number = 3): this {
    this.options.group_by = field;
    this.options.group_limit = limit;
    return this;
  }

  /**
   * Build filter string for Typesense
   */
  private buildFilterBy(): string {
    if (this.filters.length === 0) {
      return '';
    }

    return this.filters
      .map(filter => {
        const { field, operator, value, value_end } = filter;

        switch (operator) {
          case '=':
            return `${field}:=${this.formatValue(value)}`;
          case '!=':
            return `${field}:!=${this.formatValue(value)}`;
          case '>':
            return `${field}:>${this.formatValue(value)}`;
          case '<':
            return `${field}:<${this.formatValue(value)}`;
          case '>=':
            return `${field}:>=${this.formatValue(value)}`;
          case '<=':
            return `${field}:<=${this.formatValue(value)}`;
          case 'in':
            return `${field}:=[${this.formatArrayValue(value)}]`;
          case 'not_in':
            return `${field}:!=[${this.formatArrayValue(value)}]`;
          case 'contains':
            return `${field}:=${this.formatValue(value)}`;
          case 'range':
            return `${field}:[${this.formatValue(value)}..${this.formatValue(value_end)}]`;
          default:
            return '';
        }
      })
      .filter(f => f)
      .join(' && ');
  }

  /**
   * Format value for filter string
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return value.includes(' ') ? `\`${value}\`` : value;
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    return String(value);
  }

  /**
   * Format array values
   */
  private formatArrayValue(values: any[]): string {
    return values.map(v => this.formatValue(v)).join(',');
  }

  /**
   * Build facet string
   */
  private buildFacetBy(): string {
    return this.facets.map(f => f.field).join(',');
  }

  /**
   * Build sort string
   */
  private buildSortBy(): string {
    return this.sorts.map(s => `${s.field}:${s.direction}`).join(',');
  }

  /**
   * Build query by weights string
   */
  private buildQueryByWeights(): string {
    if (this.queryByWeights.length === 0) {
      return '';
    }
    return this.queryByWeights.join(',');
  }

  /**
   * Build complete query configuration
   * 
   * @returns Query configuration object
   */
  build(): QueryConfig {
    const config: QueryConfig = {
      q: this.query,
      query_by: this.queryByFields.join(',') || 'name,description',
      page: this.page,
      per_page: this.perPage,
      ...this.options,
    };

    // Add query by weights if specified
    const weights = this.buildQueryByWeights();
    if (weights) {
      config.query_by_weights = weights;
    }

    // Add filters
    const filterBy = this.buildFilterBy();
    if (filterBy) {
      config.filter_by = filterBy;
    }

    // Add facets
    const facetBy = this.buildFacetBy();
    if (facetBy) {
      config.facet_by = facetBy;
      
      // Set max facet values from first facet if any
      if (this.facets.length > 0 && this.facets[0].maxValues) {
        config.max_facet_values = this.facets[0].maxValues;
      }
    }

    // Add sorting
    const sortBy = this.buildSortBy();
    if (sortBy) {
      config.sort_by = sortBy;
    }

    logger.debug('Built search query', {
      query: config.q,
      filters: this.filters.length,
      facets: this.facets.length,
      sorts: this.sorts.length,
    });

    return config;
  }

  /**
   * Reset builder to initial state
   */
  reset(): this {
    this.query = '*';
    this.filters = [];
    this.facets = [];
    this.sorts = [];
    this.page = 1;
    this.perPage = 20;
    this.queryByFields = [];
    this.queryByWeights = [];
    this.options = {};
    return this;
  }

  /**
   * Clone builder with current configuration
   */
  clone(): AdvancedQueryBuilder {
    const builder = new AdvancedQueryBuilder();
    builder.query = this.query;
    builder.filters = [...this.filters];
    builder.facets = [...this.facets];
    builder.sorts = [...this.sorts];
    builder.page = this.page;
    builder.perPage = this.perPage;
    builder.queryByFields = [...this.queryByFields];
    builder.queryByWeights = [...this.queryByWeights];
    builder.options = { ...this.options };
    return builder;
  }

  /**
   * Get current configuration as JSON
   */
  toJSON(): any {
    return {
      query: this.query,
      filters: this.filters,
      facets: this.facets,
      sorts: this.sorts,
      page: this.page,
      per_page: this.perPage,
      query_by: this.queryByFields,
      options: this.options,
    };
  }

  /**
   * Load configuration from JSON
   */
  fromJSON(json: any): this {
    if (json.query) this.query = json.query;
    if (json.filters) this.filters = json.filters;
    if (json.facets) this.facets = json.facets;
    if (json.sorts) this.sorts = json.sorts;
    if (json.page) this.page = json.page;
    if (json.per_page) this.perPage = json.per_page;
    if (json.query_by) this.queryByFields = json.query_by;
    if (json.options) this.options = json.options;
    return this;
  }

  /**
   * Validate query configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.queryByFields.length === 0) {
      errors.push('No query fields specified');
    }

    if (this.page < 1) {
      errors.push('Page number must be >= 1');
    }

    if (this.perPage < 1 || this.perPage > 250) {
      errors.push('Per page must be between 1 and 250');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default AdvancedQueryBuilder;
