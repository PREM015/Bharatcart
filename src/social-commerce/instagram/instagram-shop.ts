/**
 * Instagram Shop Integration
 * Purpose: Integrate products with Instagram Shopping
 * Description: Product catalog sync, shop setup, checkout
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export interface InstagramShopConfig {
  page_id: string;
  access_token: string;
  catalog_id: string;
  business_account_id: string;
}

export interface InstagramProduct {
  id: string;
  retailer_id: string; // Your product SKU
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  brand: string;
  image_url: string;
  additional_image_urls?: string[];
  url: string;
  category?: string;
  google_product_category?: string;
  custom_labels?: Record<string, string>;
}

export class InstagramShopManager {
  private config: InstagramShopConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: InstagramShopConfig) {
    this.config = config;
  }

  /**
   * Set up Instagram Shop
   */
  async setupShop(): Promise<void> {
    logger.info('Setting up Instagram Shop');

    try {
      // Enable shopping on Instagram account
      await this.enableShopping();

      // Connect product catalog
      await this.connectCatalog();

      // Configure checkout settings
      await this.configureCheckout();

      logger.info('Instagram Shop setup completed');
    } catch (error) {
      logger.error('Failed to setup Instagram Shop', { error });
      throw error;
    }
  }

  /**
   * Enable shopping on Instagram
   */
  private async enableShopping(): Promise<void> {
    const url = `${this.baseUrl}/${this.config.business_account_id}`;

    await axios.post(
      url,
      {
        shopping_review_status: 'approved',
      },
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Connect product catalog
   */
  private async connectCatalog(): Promise<void> {
    const url = `${this.baseUrl}/${this.config.business_account_id}`;

    await axios.post(
      url,
      {
        catalog_id: this.config.catalog_id,
      },
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Configure checkout
   */
  private async configureCheckout(): Promise<void> {
    const url = `${this.baseUrl}/${this.config.business_account_id}`;

    await axios.post(
      url,
      {
        checkout_enabled: true,
        checkout_url: process.env.CHECKOUT_URL,
      },
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Sync product to Instagram catalog
   */
  async syncProduct(product: InstagramProduct): Promise<string> {
    logger.info('Syncing product to Instagram', { product_id: product.retailer_id });

    const url = `${this.baseUrl}/${this.config.catalog_id}/products`;

    try {
      const response = await axios.post(
        url,
        {
          retailer_id: product.retailer_id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          availability: product.availability,
          condition: product.condition,
          brand: product.brand,
          image_url: product.image_url,
          additional_image_urls: product.additional_image_urls,
          url: product.url,
          category: product.category,
          google_product_category: product.google_product_category,
          custom_label_0: product.custom_labels?.['0'],
          custom_label_1: product.custom_labels?.['1'],
          custom_label_2: product.custom_labels?.['2'],
          custom_label_3: product.custom_labels?.['3'],
          custom_label_4: product.custom_labels?.['4'],
        },
        {
          params: {
            access_token: this.config.access_token,
          },
        }
      );

      const productId = response.data.id;

      // Save mapping
      await this.saveProductMapping(product.retailer_id, productId);

      return productId;
    } catch (error: any) {
      logger.error('Failed to sync product', {
        product_id: product.retailer_id,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk sync products
   */
  async bulkSyncProducts(products: InstagramProduct[]): Promise<void> {
    logger.info('Bulk syncing products to Instagram', { count: products.length });

    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(batch.map(product => this.syncProduct(product)));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    retailerId: string,
    updates: Partial<InstagramProduct>
  ): Promise<void> {
    logger.info('Updating Instagram product', { retailer_id: retailerId });

    const mapping = await this.getProductMapping(retailerId);
    if (!mapping) {
      throw new Error('Product not found in Instagram catalog');
    }

    const url = `${this.baseUrl}/${mapping.instagram_product_id}`;

    await axios.post(
      url,
      updates,
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Delete product
   */
  async deleteProduct(retailerId: string): Promise<void> {
    logger.info('Deleting Instagram product', { retailer_id: retailerId });

    const mapping = await this.getProductMapping(retailerId);
    if (!mapping) {
      return; // Already deleted
    }

    const url = `${this.baseUrl}/${mapping.instagram_product_id}`;

    await axios.delete(url, {
      params: {
        access_token: this.config.access_token,
      },
    });

    await this.deleteProductMapping(retailerId);
  }

  /**
   * Get product insights
   */
  async getProductInsights(retailerId: string): Promise<any> {
    const mapping = await this.getProductMapping(retailerId);
    if (!mapping) {
      throw new Error('Product not found');
    }

    const url = `${this.baseUrl}/${mapping.instagram_product_id}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: 'product_views,product_clicks,product_saves',
        period: 'day',
        access_token: this.config.access_token,
      },
    });

    return response.data;
  }

  /**
   * Save product mapping
   */
  private async saveProductMapping(
    retailerId: string,
    instagramProductId: string
  ): Promise<void> {
    await prisma.instagramProductMapping.upsert({
      where: { retailer_id: retailerId },
      create: {
        retailer_id: retailerId,
        instagram_product_id: instagramProductId,
        catalog_id: this.config.catalog_id,
        created_at: new Date(),
      },
      update: {
        instagram_product_id: instagramProductId,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Get product mapping
   */
  private async getProductMapping(retailerId: string): Promise<any> {
    return prisma.instagramProductMapping.findUnique({
      where: { retailer_id: retailerId },
    });
  }

  /**
   * Delete product mapping
   */
  private async deleteProductMapping(retailerId: string): Promise<void> {
    await prisma.instagramProductMapping.delete({
      where: { retailer_id: retailerId },
    });
  }

  /**
   * Get shop metrics
   */
  async getShopMetrics(): Promise<any> {
    const url = `${this.baseUrl}/${this.config.business_account_id}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: 'product_button_clicks,product_detail_page_views,shopping_product_views',
        period: 'day',
        access_token: this.config.access_token,
      },
    });

    return response.data;
  }
}

export default InstagramShopManager;
