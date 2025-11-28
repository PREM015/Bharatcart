/**
 * Product Search Indexer
 * Purpose: Index products into search engine with real-time updates
 * Description: Transform product data for optimal search performance
 * 
 * Features:
 * - Real-time product indexing
 * - Automatic field transformation
 * - Incremental updates
 * - Bulk indexing with batching
 * - Error handling and retry logic
 * - Index optimization
 * - Custom field mapping
 * 
 * Indexed Fields:
 * - Basic: id, name, description, sku
 * - Pricing: price, sale_price, discount_percentage
 * - Categories: category_ids, category_names, category_hierarchy
 * - Brand: brand_id, brand_name
 * - Inventory: in_stock, stock_quantity
 * - Metadata: tags, attributes, custom_fields
 * - Popularity: view_count, sales_count, rating, review_count
 * - Images: image_url, image_urls
 * - Dates: created_at, updated_at
 * 
 * Search Optimization:
 * - Popularity scoring (views + sales + ratings)
 * - Recency boost for new products
 * - Stock availability weighting
 * - Price normalization
 * 
 * @example
 * ```typescript
 * const indexer = new ProductIndexer(typesenseEngine);
 * await indexer.initialize();
 * await indexer.indexProduct(productId);
 * ```
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TypesenseEngine } from '../engines/typesense';
import { EventEmitter } from 'events';

export interface ProductSearchDocument {
  id: string;
  name: string;
  description: string;
  sku: string;
  slug: string;
  
  // Pricing
  price: number;
  sale_price?: number;
  discount_percentage?: number;
  currency: string;
  
  // Categories
  category_ids: string[];
  category_names: string[];
  category_hierarchy: string[];
  primary_category?: string;
  
  // Brand
  brand_id?: string;
  brand_name?: string;
  
  // Inventory
  in_stock: boolean;
  stock_quantity: number;
  
  // Metadata
  tags: string[];
  attributes: Record<string, any>;
  color?: string;
  size?: string;
  material?: string;
  
  // Images
  image_url: string;
  image_urls: string[];
  
  // Reviews & Ratings
  rating: number;
  review_count: number;
  
  // Popularity & Engagement
  popularity_score: number;
  view_count: number;
  sales_count: number;
  wishlist_count: number;
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  
  // Timestamps
  created_at: number;
  updated_at: number;
  published_at?: number;
}

export interface IndexingStats {
  total: number;
  indexed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
}

export interface IndexingOptions {
  batchSize?: number;
  skipInactive?: boolean;
  forceReindex?: boolean;
  updateOnly?: boolean;
}

export class ProductIndexer extends EventEmitter {
  private searchEngine: TypesenseEngine;
  private collectionName = 'products';
  private isInitialized = false;

  constructor(searchEngine: TypesenseEngine) {
    super();
    this.searchEngine = searchEngine;
  }

  /**
   * Initialize product search collection
   * Creates the collection schema if it doesn't exist
   * 
   * @throws Error if schema creation fails
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Product indexer already initialized');
      return;
    }

    logger.info('Initializing product search collection');

    await this.searchEngine.createCollection({
      name: this.collectionName,
      fields: [
        // Basic fields
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string', sort: true },
        { name: 'description', type: 'string' },
        { name: 'sku', type: 'string' },
        { name: 'slug', type: 'string' },
        
        // Pricing
        { name: 'price', type: 'float', facet: true, sort: true },
        { name: 'sale_price', type: 'float', optional: true, facet: true },
        { name: 'discount_percentage', type: 'int32', optional: true, facet: true },
        { name: 'currency', type: 'string', facet: true },
        
        // Categories
        { name: 'category_ids', type: 'string[]', facet: true },
        { name: 'category_names', type: 'string[]', facet: true },
        { name: 'category_hierarchy', type: 'string[]' },
        { name: 'primary_category', type: 'string', optional: true, facet: true },
        
        // Brand
        { name: 'brand_id', type: 'string', optional: true, facet: true },
        { name: 'brand_name', type: 'string', optional: true, facet: true },
        
        // Inventory
        { name: 'in_stock', type: 'bool', facet: true },
        { name: 'stock_quantity', type: 'int32' },
        
        // Metadata
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'attributes', type: 'object', optional: true },
        { name: 'color', type: 'string', optional: true, facet: true },
        { name: 'size', type: 'string', optional: true, facet: true },
        { name: 'material', type: 'string', optional: true, facet: true },
        
        // Images
        { name: 'image_url', type: 'string' },
        { name: 'image_urls', type: 'string[]' },
        
        // Reviews
        { name: 'rating', type: 'float', facet: true, sort: true },
        { name: 'review_count', type: 'int32', sort: true },
        
        // Popularity
        { name: 'popularity_score', type: 'int32', sort: true },
        { name: 'view_count', type: 'int32' },
        { name: 'sales_count', type: 'int32', sort: true },
        { name: 'wishlist_count', type: 'int32' },
        
        // SEO
        { name: 'meta_title', type: 'string', optional: true },
        { name: 'meta_description', type: 'string', optional: true },
        
        // Status
        { name: 'is_active', type: 'bool', facet: true },
        { name: 'is_featured', type: 'bool', facet: true },
        
        // Timestamps
        { name: 'created_at', type: 'int64', sort: true },
        { name: 'updated_at', type: 'int64', sort: true },
        { name: 'published_at', type: 'int64', optional: true, sort: true },
      ],
      default_sorting_field: 'popularity_score',
      enable_nested_fields: true,
    });

    this.isInitialized = true;
    
    logger.info('Product search collection initialized successfully');
    this.emit('initialized');
  }

  /**
   * Index a single product
   * 
   * @param productId - Database product ID
   * @param action - Index action type
   * @throws Error if product not found or indexing fails
   * 
   * @example
   * ```typescript
   * await indexer.indexProduct(123, 'upsert');
   * ```
   */
  async indexProduct(
    productId: number,
    action: 'create' | 'update' | 'upsert' = 'upsert'
  ): Promise<void> {
    logger.info('Indexing product', { product_id: productId, action });

    const startTime = Date.now();

    try {
      // Fetch product with all relations
      const product = await this.fetchProductWithRelations(productId);

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Transform to search document
      const document = await this.transformToDocument(product);

      // Index document
      await this.searchEngine.indexDocument(
        this.collectionName,
        document,
        action
      );

      const duration = Date.now() - startTime;

      logger.info('Product indexed successfully', {
        product_id: productId,
        duration_ms: duration,
      });

      this.emit('product_indexed', {
        product_id: productId,
        action,
        duration_ms: duration,
      });
    } catch (error: any) {
      logger.error('Failed to index product', {
        product_id: productId,
        error: error.message,
      });

      this.emit('product_index_failed', {
        product_id: productId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Fetch product with all necessary relations
   */
  private async fetchProductWithRelations(productId: number): Promise<any> {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: {
          include: {
            parent: true,
          },
        },
        brand: true,
        variants: true,
        reviews: {
          select: {
            rating: true,
          },
        },
        inventory: true,
        images: true,
      },
    });
  }

  /**
   * Transform product to search document
   * 
   * @param product - Product from database with relations
   * @returns Formatted search document
   */
  private async transformToDocument(product: any): Promise<ProductSearchDocument> {
    // Calculate average rating
    const avgRating = product.reviews?.length > 0
      ? product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.reviews.length
      : 0;

    // Extract category hierarchy
    const categoryHierarchy = this.buildCategoryHierarchy(product.categories);

    // Parse images
    const images = product.images?.map((img: any) => img.url) || [];
    const imageUrl = images[0] || product.image_url || '';

    // Extract attributes
    const attributes = product.attributes ? JSON.parse(product.attributes) : {};

    // Calculate discount percentage
    const discountPercentage = product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : undefined;

    // Build tags array
    const tags = product.tags ? JSON.parse(product.tags) : [];

    return {
      id: product.id.toString(),
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      slug: product.slug,
      
      // Pricing (convert from cents to dollars)
      price: product.price / 100,
      sale_price: product.sale_price ? product.sale_price / 100 : undefined,
      discount_percentage: discountPercentage,
      currency: product.currency || 'USD',
      
      // Categories
      category_ids: product.categories?.map((c: any) => c.id.toString()) || [],
      category_names: product.categories?.map((c: any) => c.name) || [],
      category_hierarchy: categoryHierarchy,
      primary_category: product.categories?.[0]?.name,
      
      // Brand
      brand_id: product.brand?.id.toString(),
      brand_name: product.brand?.name,
      
      // Inventory
      in_stock: (product.inventory?.quantity || 0) > 0,
      stock_quantity: product.inventory?.quantity || 0,
      
      // Metadata
      tags,
      attributes,
      color: attributes.color,
      size: attributes.size,
      material: attributes.material,
      
      // Images
      image_url: imageUrl,
      image_urls: images,
      
      // Reviews
      rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      review_count: product.reviews?.length || 0,
      
      // Popularity
      popularity_score: this.calculatePopularityScore(product),
      view_count: product.view_count || 0,
      sales_count: product.sales_count || 0,
      wishlist_count: product.wishlist_count || 0,
      
      // SEO
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      
      // Status
      is_active: product.is_active !== false,
      is_featured: product.is_featured || false,
      
      // Timestamps (convert to Unix timestamp)
      created_at: Math.floor(product.created_at.getTime() / 1000),
      updated_at: Math.floor(product.updated_at.getTime() / 1000),
      published_at: product.published_at
        ? Math.floor(product.published_at.getTime() / 1000)
        : undefined,
    };
  }

  /**
   * Build category hierarchy for better filtering
   * Example: ["Electronics > Computers > Laptops"]
   */
  private buildCategoryHierarchy(categories: any[]): string[] {
    if (!categories || categories.length === 0) {
      return [];
    }

    return categories.map(category => {
      const hierarchy: string[] = [category.name];
      let current = category.parent;

      while (current) {
        hierarchy.unshift(current.name);
        current = current.parent;
      }

      return hierarchy.join(' > ');
    });
  }

  /**
   * Calculate popularity score based on multiple factors
   * 
   * Scoring algorithm:
   * - Views: 1 point each
   * - Sales: 10 points each
   * - Reviews: 5 points each
   * - Rating: 20 points per star (max 100)
   * - Wishlist: 3 points each
   * - Recency: Up to 50 points for new products
   */
  private calculatePopularityScore(product: any): number {
    let score = 0;

    // Views weight
    score += (product.view_count || 0) * 1;

    // Sales weight (strong indicator)
    score += (product.sales_count || 0) * 10;

    // Reviews weight
    score += (product.reviews?.length || 0) * 5;

    // Rating weight
    if (product.reviews?.length > 0) {
      const avgRating = product.reviews.reduce(
        (sum: number, r: any) => sum + r.rating,
        0
      ) / product.reviews.length;
      score += avgRating * 20;
    }

    // Wishlist weight
    score += (product.wishlist_count || 0) * 3;

    // Recency boost (newer products get higher score)
    const daysSinceCreation = Math.floor(
      (Date.now() - product.created_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation <= 7) {
      score += 50; // Very new
    } else if (daysSinceCreation <= 30) {
      score += 30; // New
    } else if (daysSinceCreation <= 90) {
      score += 10; // Recent
    }

    return Math.round(score);
  }

  /**
   * Bulk index all products
   * 
   * @param options - Indexing options
   * @returns Indexing statistics
   * 
   * @example
   * ```typescript
   * const stats = await indexer.indexAllProducts({
   *   batchSize: 100,
   *   skipInactive: true
   * });
   * ```
   */
  async indexAllProducts(options: IndexingOptions = {}): Promise<IndexingStats> {
    const {
      batchSize = 100,
      skipInactive = false,
      forceReindex = false,
    } = options;

    logger.info('Starting bulk product indexing', {
      batch_size: batchSize,
      skip_inactive: skipInactive,
    });

    const startTime = Date.now();
    const stats: IndexingStats = {
      total: 0,
      indexed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: 0,
    };

    try {
      // Get total count
      const where: any = {};
      if (skipInactive) {
        where.is_active = true;
      }

      stats.total = await prisma.product.count({ where });

      logger.info('Products to index', { count: stats.total });

      // Process in batches
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const products = await prisma.product.findMany({
          where,
          skip: page * batchSize,
          take: batchSize,
          include: {
            categories: {
              include: { parent: true },
            },
            brand: true,
            reviews: {
              select: { rating: true },
            },
            inventory: true,
            images: true,
          },
        });

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        // Transform to documents
        const documents = await Promise.all(
          products.map(p => this.transformToDocument(p))
        );

        // Bulk index
        try {
          const result = await this.searchEngine.bulkIndex(
            this.collectionName,
            documents,
            'upsert',
            batchSize
          );

          stats.indexed += result.num_imported;
          stats.failed += result.num_failed;

          logger.info('Batch indexed', {
            batch: page + 1,
            indexed: result.num_imported,
            failed: result.num_failed,
          });

          this.emit('batch_indexed', {
            batch: page + 1,
            count: products.length,
            indexed: result.num_imported,
            failed: result.num_failed,
          });
        } catch (error: any) {
          logger.error('Batch indexing failed', {
            batch: page + 1,
            error: error.message,
          });
          stats.failed += products.length;
        }

        page++;

        // Small delay to avoid overwhelming the search engine
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      stats.duration_ms = Date.now() - startTime;

      logger.info('Bulk indexing completed', stats);

      this.emit('indexing_completed', stats);

      return stats;
    } catch (error: any) {
      logger.error('Bulk indexing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete product from index
   * 
   * @param productId - Product ID to delete
   */
  async deleteProduct(productId: number): Promise<void> {
    logger.info('Deleting product from index', { product_id: productId });

    try {
      await this.searchEngine.deleteDocument(
        this.collectionName,
        productId.toString()
      );

      this.emit('product_deleted', { product_id: productId });
    } catch (error: any) {
      logger.error('Failed to delete product from index', {
        product_id: productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update product in index
   * Convenience method that re-indexes the product
   */
  async updateProduct(productId: number): Promise<void> {
    await this.indexProduct(productId, 'update');
  }

  /**
   * Reindex all products (full refresh)
   * Deletes and recreates the collection
   */
  async reindexAll(): Promise<IndexingStats> {
    logger.info('Starting full reindex');

    try {
      // Delete existing collection
      try {
        await this.searchEngine.deleteCollection(this.collectionName);
        logger.info('Existing collection deleted');
      } catch (error) {
        logger.warn('Collection does not exist, creating new');
      }

      // Reinitialize
      this.isInitialized = false;
      await this.initialize();

      // Index all products
      const stats = await this.indexAllProducts({ forceReindex: true });

      logger.info('Full reindex completed', stats);

      return stats;
    } catch (error: any) {
      logger.error('Full reindex failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get indexing statistics
   */
  async getStats(): Promise<any> {
    return this.searchEngine.getStats(this.collectionName);
  }

  /**
   * Handle product created event
   */
  async handleProductCreated(productId: number): Promise<void> {
    logger.info('Handling product created event', { product_id: productId });
    await this.indexProduct(productId, 'create');
  }

  /**
   * Handle product updated event
   */
  async handleProductUpdated(productId: number): Promise<void> {
    logger.info('Handling product updated event', { product_id: productId });
    await this.updateProduct(productId);
  }

  /**
   * Handle product deleted event
   */
  async handleProductDeleted(productId: number): Promise<void> {
    logger.info('Handling product deleted event', { product_id: productId });
    await this.deleteProduct(productId);
  }

  /**
   * Verify index integrity
   * Checks if all active products are indexed
   */
  async verifyIntegrity(): Promise<{
    database_count: number;
    index_count: number;
    missing: number[];
  }> {
    logger.info('Verifying index integrity');

    const dbProducts = await prisma.product.findMany({
      where: { is_active: true },
      select: { id: true },
    });

    const stats = await this.getStats();

    const missing: number[] = [];

    // Check each product
    for (const product of dbProducts) {
      try {
        await this.searchEngine.getDocument(
          this.collectionName,
          product.id.toString()
        );
      } catch (error) {
        missing.push(product.id);
      }
    }

    return {
      database_count: dbProducts.length,
      index_count: stats.num_documents,
      missing,
    };
  }
}

export default ProductIndexer;
