/**
 * Snapchat AR Try-On
 * Purpose: Implement AR product try-on experiences
 * Description: Lens creation, virtual try-on, conversion tracking
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export interface ARLensConfig {
  name: string;
  product_id: string;
  model_url: string; // 3D model of product
  category: 'FASHION' | 'BEAUTY' | 'ACCESSORIES' | 'EYEWEAR';
  tracking_type: 'FACE' | 'WORLD' | 'HAND';
}

export class SnapchatARTryOn {
  private accessToken: string;
  private organizationId: string;
  private baseUrl = 'https://adsapi.snapchat.com/v1';

  constructor(accessToken: string, organizationId: string) {
    this.accessToken = accessToken;
    this.organizationId = organizationId;
  }

  /**
   * Create AR lens
   */
  async createARLens(config: ARLensConfig): Promise<string> {
    logger.info('Creating Snapchat AR lens', { name: config.name });

    const url = `${this.baseUrl}/organizations/${this.organizationId}/lenses`;

    try {
      const response = await axios.post(
        url,
        {
          name: config.name,
          product_id: config.product_id,
          lens_type: 'AR_TRY_ON',
          category: config.category,
          tracking_type: config.tracking_type,
          asset_url: config.model_url,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const lensId = response.data.lens.id;
      logger.info('AR lens created', { lens_id: lensId });

      return lensId;
    } catch (error: any) {
      logger.error('Failed to create AR lens', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get lens analytics
   */
  async getLensAnalytics(lensId: string, dateRange: {
    start_date: string;
    end_date: string;
  }): Promise<any> {
    const url = `${this.baseUrl}/lenses/${lensId}/stats`;

    const response = await axios.get(url, {
      params: {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        granularity: 'DAY',
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }

  /**
   * Track conversion from AR try-on
   */
  async trackConversion(lensId: string, userId: string, productId: string): Promise<void> {
    logger.info('Tracking AR try-on conversion', {
      lens_id: lensId,
      product_id: productId,
    });

    const url = `${this.baseUrl}/conversions`;

    await axios.post(
      url,
      {
        lens_id: lensId,
        user_id: userId,
        product_id: productId,
        event_type: 'PURCHASE',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
  }
}

export default SnapchatARTryOn;
