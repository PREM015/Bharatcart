/**
 * Facebook Catalog Manager
 * Purpose: Manage Facebook product catalogs
 * Description: Catalog creation, product feeds, bulk operations
 */

import { logger } from '@/lib/logger';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface CatalogConfig {
  name: string;
  vertical: 'commerce' | 'travel' | 'real_estate' | 'auto' | 'media';
  business_id: string;
}

export interface ProductFeed {
  name: string;
  schedule: 'DAILY' | 'WEEKLY' | 'HOURLY';
  file_url?: string;
  file_format: 'CSV' | 'TSV' | 'XML';
}

export class FacebookCatalogManager {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Create product catalog
   */
  async createCatalog(config: CatalogConfig): Promise<string> {
    logger.info('Creating Facebook catalog', { name: config.name });

    const url = `${this.baseUrl}/${config.business_id}/product_catalogs`;

    try {
      const response = await axios.post(
        url,
        {
          name: config.name,
          vertical: config.vertical,
        },
        {
          params: {
            access_token: this.accessToken,
          },
        }
      );

      const catalogId = response.data.id;
      logger.info('Catalog created', { catalog_id: catalogId });

      return catalogId;
    } catch (error: any) {
      logger.error('Failed to create catalog', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Create product feed
   */
  async createProductFeed(
    catalogId: string,
    feed: ProductFeed
  ): Promise<string> {
    logger.info('Creating product feed', { catalog_id: catalogId, name: feed.name });

    const url = `${this.baseUrl}/${catalogId}/product_feeds`;

    try {
      const response = await axios.post(
        url,
        {
          name: feed.name,
          schedule: feed.schedule,
          url: feed.file_url,
          format: feed.file_format,
        },
        {
          params: {
            access_token: this.accessToken,
          },
        }
      );

      return response.data.id;
    } catch (error: any) {
      logger.error('Failed to create product feed', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Upload product feed
   */
  async uploadProductFeed(
    feedId: string,
    products: any[]
  ): Promise<void> {
    logger.info('Uploading product feed', { feed_id: feedId, count: products.length });

    // Generate CSV
    const csv = this.generateProductCSV(products);

    // Upload to Facebook
    const url = `${this.baseUrl}/${feedId}/uploads`;

    await axios.post(
      url,
      {
        file: csv,
      },
      {
        params: {
          access_token: this.accessToken,
        },
        headers: {
          'Content-Type': 'text/csv',
        },
      }
    );
  }

  /**
   * Generate product CSV
   */
  private generateProductCSV(products: any[]): string {
    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
      'google_product_category',
    ];

    const rows = products.map(product => [
      product.id,
      `"${product.name}"`,
      `"${product.description}"`,
      product.availability,
      product.condition,
      `${product.price} ${product.currency}`,
      product.url,
      product.image_url,
      product.brand,
      product.category,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('
');
  }

  /**
   * Get catalog products
   */
  async getCatalogProducts(
    catalogId: string,
    limit: number = 100
  ): Promise<any[]> {
    const url = `${this.baseUrl}/${catalogId}/products`;

    const response = await axios.get(url, {
      params: {
        limit,
        fields: 'id,name,description,price,currency,availability,image_url',
        access_token: this.accessToken,
      },
    });

    return response.data.data;
  }

  /**
   * Get feed upload status
   */
  async getFeedUploadStatus(uploadId: string): Promise<any> {
    const url = `${this.baseUrl}/${uploadId}`;

    const response = await axios.get(url, {
      params: {
        fields: 'id,end_time,num_detected_items,num_persisted_items,errors',
        access_token: this.accessToken,
      },
    });

    return response.data;
  }

  /**
   * Batch update products
   */
  async batchUpdateProducts(
    catalogId: string,
    updates: Array<{ id: string; updates: any }>
  ): Promise<void> {
    logger.info('Batch updating products', { catalog_id: catalogId, count: updates.length });

    const url = `${this.baseUrl}/${catalogId}/batch`;

    const requests = updates.map(({ id, updates: productUpdates }) => ({
      method: 'UPDATE',
      retailer_id: id,
      data: productUpdates,
    }));

    await axios.post(
      url,
      {
        requests,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Delete catalog
   */
  async deleteCatalog(catalogId: string): Promise<void> {
    logger.info('Deleting catalog', { catalog_id: catalogId });

    const url = `${this.baseUrl}/${catalogId}`;

    await axios.delete(url, {
      params: {
        access_token: this.accessToken,
      },
    });
  }

  /**
   * Get catalog diagnostics
   */
  async getCatalogDiagnostics(catalogId: string): Promise<any> {
    const url = `${this.baseUrl}/${catalogId}/diagnostics`;

    const response = await axios.get(url, {
      params: {
        access_token: this.accessToken,
      },
    });

    return response.data;
  }
}

export default FacebookCatalogManager;
