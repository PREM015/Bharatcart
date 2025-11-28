/**
 * Facebook Marketplace Sync
 * Purpose: Sync products to Facebook Marketplace
 * Description: Listing creation, inventory sync, pricing updates
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export interface MarketplaceListing {
  retailer_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  availability: 'in stock' | 'out of stock';
  images: string[];
  location: {
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  shipping_info?: {
    shipping_enabled: boolean;
    local_pickup: boolean;
    shipping_price?: number;
  };
}

export class FacebookMarketplaceSync {
  private accessToken: string;
  private catalogId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string, catalogId: string) {
    this.accessToken = accessToken;
    this.catalogId = catalogId;
  }

  /**
   * Create marketplace listing
   */
  async createListing(listing: MarketplaceListing): Promise<string> {
    logger.info('Creating marketplace listing', { retailer_id: listing.retailer_id });

    const url = `${this.baseUrl}/${this.catalogId}/products`;

    try {
      const response = await axios.post(
        url,
        {
          retailer_id: listing.retailer_id,
          name: listing.name,
          description: listing.description,
          price: listing.price * 100,
          currency: listing.currency,
          category: listing.category,
          condition: listing.condition,
          availability: listing.availability,
          image_url: listing.images[0],
          additional_image_urls: listing.images.slice(1),
          location: listing.location,
          shipping_info: listing.shipping_info,
          marketplace_product: true,
        },
        {
          params: {
            access_token: this.accessToken,
          },
        }
      );

      return response.data.id;
    } catch (error: any) {
      logger.error('Failed to create listing', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Update listing
   */
  async updateListing(
    productId: string,
    updates: Partial<MarketplaceListing>
  ): Promise<void> {
    logger.info('Updating marketplace listing', { product_id: productId });

    const url = `${this.baseUrl}/${productId}`;

    const updateData: any = { ...updates };
    if (updates.price) updateData.price = updates.price * 100;

    await axios.post(url, updateData, {
      params: {
        access_token: this.accessToken,
      },
    });
  }

  /**
   * Delete listing
   */
  async deleteListing(productId: string): Promise<void> {
    logger.info('Deleting marketplace listing', { product_id: productId });

    const url = `${this.baseUrl}/${productId}`;

    await axios.delete(url, {
      params: {
        access_token: this.accessToken,
      },
    });
  }

  /**
   * Sync inventory
   */
  async syncInventory(retailerId: string, quantity: number): Promise<void> {
    logger.info('Syncing marketplace inventory', { retailer_id: retailerId, quantity });

    const url = `${this.baseUrl}/${this.catalogId}/products`;

    await axios.post(
      url,
      {
        retailer_id: retailerId,
        inventory: quantity,
        availability: quantity > 0 ? 'in stock' : 'out of stock',
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Get marketplace insights
   */
  async getMarketplaceInsights(productId: string): Promise<any> {
    const url = `${this.baseUrl}/${productId}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: 'product_views,product_saves,product_clicks',
        period: 'day',
        access_token: this.accessToken,
      },
    });

    return response.data;
  }

  /**
   * Bulk sync listings
   */
  async bulkSyncListings(listings: MarketplaceListing[]): Promise<void> {
    logger.info('Bulk syncing marketplace listings', { count: listings.length });

    const batchSize = 50;
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      await Promise.all(batch.map(listing => this.createListing(listing)));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export default FacebookMarketplaceSync;
