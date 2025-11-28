/**
 * TikTok Live Shopping
 * Purpose: Manage TikTok live shopping features
 * Description: Live stream setup, product pinning, real-time sales
 */

import { logger } from '@/lib/logger';
import axios from 'axios';
import { EventEmitter } from 'events';

export interface LiveStreamConfig {
  title: string;
  description: string;
  cover_image_url: string;
  product_ids: string[];
  scheduled_start_time?: Date;
}

export interface LiveProduct {
  product_id: string;
  display_order: number;
  is_pinned: boolean;
}

export interface LiveStreamMetrics {
  stream_id: string;
  viewer_count: number;
  peak_viewers: number;
  total_views: number;
  likes: number;
  comments: number;
  shares: number;
  product_clicks: number;
  sales_count: number;
  revenue: number;
}

export class TikTokLiveShopping extends EventEmitter {
  private accessToken: string;
  private shopId: string;
  private baseUrl = 'https://open-api.tiktokglobalshop.com';

  constructor(accessToken: string, shopId: string) {
    super();
    this.accessToken = accessToken;
    this.shopId = shopId;
  }

  /**
   * Create live stream
   */
  async createLiveStream(config: LiveStreamConfig): Promise<string> {
    logger.info('Creating TikTok live stream', { title: config.title });

    const endpoint = '/api/live/create';

    try {
      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        {
          title: config.title,
          description: config.description,
          cover_image_url: config.cover_image_url,
          product_ids: config.product_ids,
          scheduled_start_time: config.scheduled_start_time?.toISOString(),
        },
        {
          params: {
            access_token: this.accessToken,
            shop_id: this.shopId,
          },
        }
      );

      const streamId = response.data.stream_id;
      logger.info('Live stream created', { stream_id: streamId });

      return streamId;
    } catch (error: any) {
      logger.error('Failed to create live stream', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Start live stream
   */
  async startLiveStream(streamId: string): Promise<void> {
    logger.info('Starting live stream', { stream_id: streamId });

    const endpoint = '/api/live/start';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    this.emit('stream_started', { stream_id: streamId });
  }

  /**
   * End live stream
   */
  async endLiveStream(streamId: string): Promise<void> {
    logger.info('Ending live stream', { stream_id: streamId });

    const endpoint = '/api/live/end';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    this.emit('stream_ended', { stream_id: streamId });
  }

  /**
   * Pin product during live
   */
  async pinProduct(streamId: string, productId: string): Promise<void> {
    logger.info('Pinning product', { stream_id: streamId, product_id: productId });

    const endpoint = '/api/live/products/pin';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        product_id: productId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    this.emit('product_pinned', { stream_id: streamId, product_id: productId });
  }

  /**
   * Unpin product
   */
  async unpinProduct(streamId: string, productId: string): Promise<void> {
    logger.info('Unpinning product', { stream_id: streamId, product_id: productId });

    const endpoint = '/api/live/products/unpin';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        product_id: productId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    this.emit('product_unpinned', { stream_id: streamId, product_id: productId });
  }

  /**
   * Add product to live stream
   */
  async addProduct(streamId: string, productId: string, displayOrder?: number): Promise<void> {
    logger.info('Adding product to live stream', {
      stream_id: streamId,
      product_id: productId,
    });

    const endpoint = '/api/live/products/add';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        product_id: productId,
        display_order: displayOrder,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Remove product from live stream
   */
  async removeProduct(streamId: string, productId: string): Promise<void> {
    logger.info('Removing product from live stream', {
      stream_id: streamId,
      product_id: productId,
    });

    const endpoint = '/api/live/products/remove';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        product_id: productId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Get live stream metrics (real-time)
   */
  async getLiveMetrics(streamId: string): Promise<LiveStreamMetrics> {
    const endpoint = '/api/live/metrics';

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      params: {
        stream_id: streamId,
        access_token: this.accessToken,
      },
    });

    return response.data;
  }

  /**
   * Get live stream sales
   */
  async getLiveSales(streamId: string): Promise<any[]> {
    const endpoint = '/api/live/sales';

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      params: {
        stream_id: streamId,
        access_token: this.accessToken,
      },
    });

    return response.data.sales;
  }

  /**
   * Send live notification
   */
  async sendLiveNotification(streamId: string, message: string): Promise<void> {
    logger.info('Sending live notification', { stream_id: streamId });

    const endpoint = '/api/live/notifications/send';

    await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        message,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Create flash sale during live
   */
  async createFlashSale(streamId: string, sale: {
    product_id: string;
    discount_percentage: number;
    quantity_limit: number;
    duration_minutes: number;
  }): Promise<string> {
    logger.info('Creating flash sale', { stream_id: streamId, product_id: sale.product_id });

    const endpoint = '/api/live/flash-sales/create';

    const response = await axios.post(
      `${this.baseUrl}${endpoint}`,
      {
        stream_id: streamId,
        ...sale,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    const saleId = response.data.sale_id;
    this.emit('flash_sale_created', { stream_id: streamId, sale_id: saleId });

    return saleId;
  }

  /**
   * Poll for live events
   */
  startEventPolling(streamId: string, interval: number = 5000): void {
    const pollInterval = setInterval(async () => {
      try {
        const metrics = await this.getLiveMetrics(streamId);
        this.emit('metrics_update', metrics);

        const sales = await this.getLiveSales(streamId);
        if (sales.length > 0) {
          this.emit('new_sales', sales);
        }
      } catch (error) {
        logger.error('Failed to poll live events', { error });
      }
    }, interval);

    this.once('stream_ended', () => {
      clearInterval(pollInterval);
    });
  }
}

export default TikTokLiveShopping;
