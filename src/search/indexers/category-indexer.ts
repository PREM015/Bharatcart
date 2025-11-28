/**
 * Category Search Indexer
 * Purpose: Index product categories for search and navigation
 * Description: Hierarchical category indexing with parent-child relationships
 * 
 * Features:
 * - Hierarchical category structure
 * - Parent-child relationships
 * - Product count per category
 * - Category path/breadcrumb
 * - Faceted navigation support
 * 
 * @example
 * ```typescript
 * const indexer = new CategoryIndexer(engine);
 * await indexer.initialize();
 * await indexer.indexCategory(categoryId);
 * ```
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TypesenseEngine } from '../engines/typesense';

export interface CategorySearchDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id?: string;
  parent_name?: string;
  parent_path: string[];
  level: number;
  product_count: number;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: number;
}

export class CategoryIndexer {
  private searchEngine: TypesenseEngine;
  private collectionName = 'categories';

  constructor(searchEngine: TypesenseEngine) {
    this.searchEngine = searchEngine;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing category search collection');

    await this.searchEngine.createCollection({
      name: this.collectionName,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string', sort: true },
        { name: 'slug', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'parent_id', type: 'string', optional: true, facet: true },
        { name: 'parent_name', type: 'string', optional: true },
        { name: 'parent_path', type: 'string[]' },
        { name: 'level', type: 'int32', facet: true },
        { name: 'product_count', type: 'int32', sort: true },
        { name: 'image_url', type: 'string', optional: true },
        { name: 'is_active', type: 'bool', facet: true },
        { name: 'display_order', type: 'int32', sort: true },
        { name: 'created_at', type: 'int64' },
      ],
      default_sorting_field: 'product_count',
    });
  }

  async indexCategory(categoryId: number): Promise<void> {
    logger.info('Indexing category', { category_id: categoryId });

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const parentPath = await this.buildParentPath(category);

    const document: CategorySearchDocument = {
      id: category.id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent?.id.toString(),
      parent_name: category.parent?.name,
      parent_path: parentPath,
      level: category.level || 0,
      product_count: category._count.products,
      image_url: category.image_url,
      is_active: category.is_active !== false,
      display_order: category.display_order || 0,
      created_at: Math.floor(category.created_at.getTime() / 1000),
    };

    await this.searchEngine.indexDocument(this.collectionName, document);
  }

  private async buildParentPath(category: any): Promise<string[]> {
    const path: string[] = [];
    let current = category.parent;

    while (current) {
      path.unshift(current.name);
      current = await prisma.category.findUnique({
        where: { id: current.parent_id || 0 },
      });
    }

    return path;
  }

  async indexAllCategories(): Promise<void> {
    logger.info('Indexing all categories');

    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        _count: { select: { products: true } },
      },
    });

    const documents = await Promise.all(
      categories.map(async cat => {
        const parentPath = await this.buildParentPath(cat);

        return {
          id: cat.id.toString(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          parent_id: cat.parent?.id.toString(),
          parent_name: cat.parent?.name,
          parent_path: parentPath,
          level: cat.level || 0,
          product_count: cat._count.products,
          image_url: cat.image_url,
          is_active: cat.is_active !== false,
          display_order: cat.display_order || 0,
          created_at: Math.floor(cat.created_at.getTime() / 1000),
        };
      })
    );

    await this.searchEngine.bulkIndex(this.collectionName, documents);
  }

  async deleteCategory(categoryId: number): Promise<void> {
    logger.info('Deleting category from index', { category_id: categoryId });
    await this.searchEngine.deleteDocument(this.collectionName, categoryId.toString());
  }
}

export default CategoryIndexer;
