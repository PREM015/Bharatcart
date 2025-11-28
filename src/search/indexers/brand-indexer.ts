/**
 * Brand Search Indexer
 * Purpose: Index brands for search and filtering
 * Description: Brand metadata with product counts and featured status
 * 
 * @example
 * ```typescript
 * const indexer = new BrandIndexer(engine);
 * await indexer.indexBrand(brandId);
 * ```
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TypesenseEngine } from '../engines/typesense';

export interface BrandSearchDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  product_count: number;
  is_featured: boolean;
  country?: string;
  website?: string;
}

export class BrandIndexer {
  private searchEngine: TypesenseEngine;
  private collectionName = 'brands';

  constructor(searchEngine: TypesenseEngine) {
    this.searchEngine = searchEngine;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing brand search collection');

    await this.searchEngine.createCollection({
      name: this.collectionName,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string', sort: true },
        { name: 'slug', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'logo_url', type: 'string', optional: true },
        { name: 'product_count', type: 'int32', sort: true },
        { name: 'is_featured', type: 'bool', facet: true },
        { name: 'country', type: 'string', optional: true, facet: true },
        { name: 'website', type: 'string', optional: true },
      ],
      default_sorting_field: 'product_count',
    });
  }

  async indexBrand(brandId: number): Promise<void> {
    logger.info('Indexing brand', { brand_id: brandId });

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    const document: BrandSearchDocument = {
      id: brand.id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo_url: brand.logo_url,
      product_count: brand._count.products,
      is_featured: brand.is_featured || false,
      country: brand.country,
      website: brand.website,
    };

    await this.searchEngine.indexDocument(this.collectionName, document);
  }

  async indexAllBrands(): Promise<void> {
    logger.info('Indexing all brands');

    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
    });

    const documents = brands.map(brand => ({
      id: brand.id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo_url: brand.logo_url,
      product_count: brand._count.products,
      is_featured: brand.is_featured || false,
      country: brand.country,
      website: brand.website,
    }));

    await this.searchEngine.bulkIndex(this.collectionName, documents);
  }

  async deleteBrand(brandId: number): Promise<void> {
    logger.info('Deleting brand from index', { brand_id: brandId });
    await this.searchEngine.deleteDocument(this.collectionName, brandId.toString());
  }
}

export default BrandIndexer;
