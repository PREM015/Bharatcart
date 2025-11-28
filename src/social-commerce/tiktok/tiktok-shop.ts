/**
 * TikTok Shop Integration
 * Purpose: Integrate with TikTok Shop platform
 * Description: Product listing, order management, live shopping
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import crypto from 'crypto';

export interface TikTokShopConfig {
  app_key: string;
  app_secret: string;
  shop_id: string;
  access_token: string;
}

export interface TikTokProduct {
  title: string;
  description: string;
  category_id: string;
  brand_id?: string;
  main_images: string[];
  video?: string;
  skus: TikTokSku[];
  weight: {
    value: number;
    unit: 'KILOGRAM' | 'GRAM';
  };
  dimension: {
    length: number;
    width: number;
    height: number;
    unit: 'CENTIMETER' | 'METER';
  };
  package_content: string;
  warranty_period?: string;
  is_cod_allowed?: boolean;
}

export interface TikTokSku {
  id?: string;
  seller_sku: string;
  sales_attributes: Array<{
    attribute_id: string;
    value_id: string;
  }>;
  price: {
    amount: number;
    currency: string;
  };
  stock_infos: Array<{
    warehouse_id: string;
    available_stock: number;
  }>;
}

export class TikTokShopManager {
  private config: TikTokShopConfig;
  private baseUrl = 'https://open-api.tiktokglobalshop.com';

  constructor(config: TikTokShopConfig) {
    this.config = config;
  }

  /**
   * Create product
   */
  async createProduct(product: TikTokProduct): Promise<string> {
    logger.info('Creating TikTok Shop product', { title: product.title });

    const endpoint = '/api/products/create';
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const response = await this.makeRequest(endpoint, 'POST', {
        product: product,
      }, timestamp);

      const productId = response.data.product_id;

      logger.info('Product created', { product_id: productId });
      return productId;
    } catch (error: any) {
      logger.error('Failed to create product', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, updates: Partial<TikTokProduct>): Promise<void> {
    logger.info('Updating TikTok product', { product_id: productId });

    const endpoint = '/api/products/update';
    const timestamp = Math.floor(Date.now() / 1000);

    await this.makeRequest(endpoint, 'POST', {
      product_id: productId,
      product: updates,
    }, timestamp);
  }

  /**
   * Update stock
   */
  async updateStock(skuId: string, warehouseId: string, quantity: number): Promise<void> {
    logger.info('Updating stock', { sku_id: skuId, quantity });

    const endpoint = '/api/products/stocks/update';
    const timestamp = Math.floor(Date.now() / 1000);

    await this.makeRequest(endpoint, 'POST', {
      sku_id: skuId,
      warehouse_id: warehouseId,
      available_stock: quantity,
    }, timestamp);
  }

  /**
   * Update price
   */
  async updatePrice(skuId: string, price: number, currency: string = 'USD'): Promise<void> {
    logger.info('Updating price', { sku_id: skuId, price });

    const endpoint = '/api/products/prices/update';
    const timestamp = Math.floor(Date.now() / 1000);

    await this.makeRequest(endpoint, 'POST', {
      sku_id: skuId,
      price: {
        amount: price,
        currency,
      },
    }, timestamp);
  }

  /**
   * Get orders
   */
  async getOrders(params?: {
    create_time_from?: number;
    create_time_to?: number;
    order_status?: string;
    page_size?: number;
    page_token?: string;
  }): Promise<any> {
    logger.info('Fetching TikTok orders');

    const endpoint = '/api/orders/search';
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await this.makeRequest(endpoint, 'POST', params || {}, timestamp);

    return response.data;
  }

  /**
   * Get order detail
   */
  async getOrderDetail(orderId: string): Promise<any> {
    const endpoint = '/api/orders/detail/query';
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await this.makeRequest(endpoint, 'POST', {
      order_id: orderId,
    }, timestamp);

    return response.data;
  }

  /**
   * Ship order
   */
  async shipOrder(orderId: string, trackingInfo: {
    tracking_number: string;
    shipping_provider_id: string;
  }): Promise<void> {
    logger.info('Shipping order', { order_id: orderId });

    const endpoint = '/api/orders/ship';
    const timestamp = Math.floor(Date.now() / 1000);

    await this.makeRequest(endpoint, 'POST', {
      order_id: orderId,
      tracking_number: trackingInfo.tracking_number,
      shipping_provider_id: trackingInfo.shipping_provider_id,
    }, timestamp);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    logger.info('Cancelling order', { order_id: orderId });

    const endpoint = '/api/orders/cancel';
    const timestamp = Math.floor(Date.now() / 1000);

    await this.makeRequest(endpoint, 'POST', {
      order_id: orderId,
      cancel_reason: reason,
    }, timestamp);
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(productId: string, dateRange: {
    start_date: string;
    end_date: string;
  }): Promise<any> {
    const endpoint = '/api/analytics/products';
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await this.makeRequest(endpoint, 'POST', {
      product_id: productId,
      ...dateRange,
    }, timestamp);

    return response.data;
  }

  /**
   * Make authenticated request
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    data: any,
    timestamp: number
  ): Promise<any> {
    const path = endpoint;
    const params: any = {
      app_key: this.config.app_key,
      timestamp,
      shop_id: this.config.shop_id,
      access_token: this.config.access_token,
    };

    // Generate signature
    const sign = this.generateSignature(path, params, data, timestamp);
    params.sign = sign;

    const url = `${this.baseUrl}${path}`;

    return axios({
      method,
      url,
      params,
      data: method === 'POST' ? data : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate request signature
   */
  private generateSignature(
    path: string,
    params: Record<string, any>,
    body: any,
    timestamp: number
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');

    const input = `${this.config.app_secret}${path}${sortedParams}${JSON.stringify(body)}${this.config.app_secret}`;

    return crypto
      .createHmac('sha256', this.config.app_secret)
      .update(input)
      .digest('hex');
  }
}

export default TikTokShopManager;
