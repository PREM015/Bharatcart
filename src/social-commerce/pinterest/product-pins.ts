/**
 * Pinterest Product Pins
 * Purpose: Create and manage Product Pins on Pinterest
 * Description: Pin creation, catalogs, rich pins
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export interface ProductPin {
  title: string;
  description: string;
  link: string;
  image_url: string;
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  brand: string;
  board_id: string;
}

export class PinterestProductPins {
  private accessToken: string;
  private baseUrl = 'https://api.pinterest.com/v5';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Create product pin
   */
  async createProductPin(pin: ProductPin): Promise<string> {
    logger.info('Creating Pinterest product pin', { title: pin.title });

    const url = `${this.baseUrl}/pins`;

    try {
      const response = await axios.post(
        url,
        {
          board_id: pin.board_id,
          title: pin.title,
          description: pin.description,
          link: pin.link,
          media_source: {
            source_type: 'image_url',
            url: pin.image_url,
          },
          product: {
            price: pin.price,
            currency: pin.currency,
            availability: pin.availability.toUpperCase().replace(' ', '_'),
            brand: pin.brand,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const pinId = response.data.id;
      logger.info('Product pin created', { pin_id: pinId });

      return pinId;
    } catch (error: any) {
      logger.error('Failed to create product pin', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Update product pin
   */
  async updateProductPin(pinId: string, updates: Partial<ProductPin>): Promise<void> {
    logger.info('Updating product pin', { pin_id: pinId });

    const url = `${this.baseUrl}/pins/${pinId}`;

    await axios.patch(
      url,
      {
        title: updates.title,
        description: updates.description,
        link: updates.link,
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
  }

  /**
   * Delete product pin
   */
  async deleteProductPin(pinId: string): Promise<void> {
    logger.info('Deleting product pin', { pin_id: pinId });

    const url = `${this.baseUrl}/pins/${pinId}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Get pin analytics
   */
  async getPinAnalytics(pinId: string): Promise<any> {
    const url = `${this.baseUrl}/pins/${pinId}/analytics`;

    const response = await axios.get(url, {
      params: {
        metric_types: 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK',
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }
}

export default PinterestProductPins;
