/**
 * Facebook Shop Integration
 * Purpose: Manage Facebook Shop and Commerce Manager
 * Description: Shop setup, product catalog, checkout configuration
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export interface FacebookShopConfig {
  page_id: string;
  access_token: string;
  catalog_id: string;
  commerce_account_id: string;
}

export interface FacebookProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued';
  condition: 'new' | 'refurbished' | 'used' | 'cpo';
  brand: string;
  image_url: string;
  additional_image_urls?: string[];
  url: string;
  category: string;
  inventory: number;
  sale_price?: number;
  sale_price_effective_date?: string;
}

export class FacebookShopManager {
  private config: FacebookShopConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: FacebookShopConfig) {
    this.config = config;
  }

  /**
   * Set up Facebook Shop
   */
  async setupShop(shopConfig: {
    name: string;
    description: string;
    cover_photo_url?: string;
  }): Promise<void> {
    logger.info('Setting up Facebook Shop');

    try {
      // Create shop
      const url = `${this.baseUrl}/${this.config.page_id}/shops`;

      await axios.post(
        url,
        {
          name: shopConfig.name,
          description: shopConfig.description,
          cover_photo_url: shopConfig.cover_photo_url,
          catalog_id: this.config.catalog_id,
        },
        {
          params: {
            access_token: this.config.access_token,
          },
        }
      );

      // Configure checkout
      await this.configureCheckout();

      logger.info('Facebook Shop setup completed');
    } catch (error: any) {
      logger.error('Failed to setup Facebook Shop', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Configure checkout
   */
  private async configureCheckout(): Promise<void> {
    const url = `${this.baseUrl}/${this.config.page_id}/commerce_settings`;

    await axios.post(
      url,
      {
        checkout_enabled: true,
        checkout_url: process.env.CHECKOUT_URL,
        merchant_compliance_status: 'APPROVED',
      },
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Add product to shop
   */
  async addProduct(product: FacebookProduct): Promise<string> {
    logger.info('Adding product to Facebook Shop', { product_id: product.id });

    const url = `${this.baseUrl}/${this.config.catalog_id}/products`;

    try {
      const response = await axios.post(
        url,
        {
          retailer_id: product.id,
          name: product.name,
          description: product.description,
          price: product.price * 100, // Convert to cents
          currency: product.currency,
          availability: product.availability,
          condition: product.condition,
          brand: product.brand,
          image_url: product.image_url,
          additional_image_urls: product.additional_image_urls,
          url: product.url,
          category: product.category,
          inventory: product.inventory,
          sale_price: product.sale_price ? product.sale_price * 100 : undefined,
          sale_price_effective_date: product.sale_price_effective_date,
        },
        {
          params: {
            access_token: this.config.access_token,
          },
        }
      );

      const productId = response.data.id;

      // Save mapping
      await this.saveProductMapping(product.id, productId);

      return productId;
    } catch (error: any) {
      logger.error('Failed to add product', {
        product_id: product.id,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    retailerId: string,
    updates: Partial<FacebookProduct>
  ): Promise<void> {
    logger.info('Updating Facebook product', { retailer_id: retailerId });

    const mapping = await this.getProductMapping(retailerId);
    if (!mapping) {
      throw new Error('Product not found in catalog');
    }

    const url = `${this.baseUrl}/${mapping.facebook_product_id}`;

    const updateData: any = { ...updates };
    if (updates.price) updateData.price = updates.price * 100;
    if (updates.sale_price) updateData.sale_price = updates.sale_price * 100;

    await axios.post(url, updateData, {
      params: {
        access_token: this.config.access_token,
      },
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(retailerId: string): Promise<void> {
    logger.info('Deleting Facebook product', { retailer_id: retailerId });

    const mapping = await this.getProductMapping(retailerId);
    if (!mapping) {
      return;
    }

    const url = `${this.baseUrl}/${mapping.facebook_product_id}`;

    await axios.delete(url, {
      params: {
        access_token: this.config.access_token,
      },
    });

    await this.deleteProductMapping(retailerId);
  }

  /**
   * Get shop orders
   */
  async getOrders(filters?: {
    state?: string;
    updated_after?: Date;
  }): Promise<any[]> {
    const url = `${this.baseUrl}/${this.config.commerce_account_id}/orders`;

    const params: any = {
      access_token: this.config.access_token,
      fields: 'id,buyer_details,shipping_address,items,order_status,created,last_updated',
    };

    if (filters?.state) params.state = filters.state;
    if (filters?.updated_after) {
      params.updated_after = Math.floor(filters.updated_after.getTime() / 1000);
    }

    const response = await axios.get(url, { params });

    return response.data.data;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED',
    trackingInfo?: {
      carrier: string;
      tracking_number: string;
    }
  ): Promise<void> {
    logger.info('Updating order status', { order_id: orderId, status });

    const url = `${this.baseUrl}/${orderId}/shipments`;

    await axios.post(
      url,
      {
        fulfillment_status: status,
        tracking_info: trackingInfo,
      },
      {
        params: {
          access_token: this.config.access_token,
        },
      }
    );
  }

  /**
   * Get shop insights
   */
  async getShopInsights(period: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const url = `${this.baseUrl}/${this.config.page_id}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: 'page_views_total,page_post_engagements,page_impressions',
        period,
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
    facebookProductId: string
  ): Promise<void> {
    await prisma.facebookProductMapping.upsert({
      where: { retailer_id: retailerId },
      create: {
        retailer_id: retailerId,
        facebook_product_id: facebookProductId,
        catalog_id: this.config.catalog_id,
        created_at: new Date(),
      },
      update: {
        facebook_product_id: facebookProductId,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Get product mapping
   */
  private async getProductMapping(retailerId: string): Promise<any> {
    return prisma.facebookProductMapping.findUnique({
      where: { retailer_id: retailerId },
    });
  }

  /**
   * Delete product mapping
   */
  private async deleteProductMapping(retailerId: string): Promise<void> {
    await prisma.facebookProductMapping.delete({
      where: { retailer_id: retailerId },
    });
  }
}

export default FacebookShopManager;
