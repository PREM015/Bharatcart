/**
 * Etsy Marketplace Synchronization
 * Purpose: Sync products, orders, inventory with Etsy API
 * Description: Complete Etsy integration using Open API v3
 */

import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface EtsyCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  refreshToken: string;
  shopId: string;
}

interface EtsyListing {
  listingId: number;
  title: string;
  description: string;
  price: number;
  quantity: number;
  sku: string;
  tags: string[];
  materials: string[];
  categoryId: number;
  whoMade: 'i_did' | 'collective' | 'someone_else';
  whenMade: string;
  shippingProfileId: number;
}

export class EtsySync {
  private credentials: EtsyCredentials;
  private baseUrl = 'https://openapi.etsy.com/v3';
  private accessToken: string;

  constructor(credentials: EtsyCredentials) {
    this.credentials = credentials;
    this.accessToken = credentials.accessToken;
  }

  /**
   * Make Etsy API request
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'x-api-key': this.credentials.apiKey,
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Etsy API request failed', {
        endpoint,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post('https://api.etsy.com/v3/public/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.credentials.apiKey,
        refresh_token: this.credentials.refreshToken,
      });

      this.accessToken = response.data.access_token;

      // Update in database
      await prisma.integrationConfig.update({
        where: { platform: 'ETSY' },
        data: {
          credentials: {
            ...this.credentials,
            accessToken: this.accessToken,
          },
        },
      });

      await redis.setex(
        `etsy:token:${this.credentials.shopId}`,
        3600,
        this.accessToken
      );
    } catch (error) {
      logger.error('Failed to refresh Etsy access token', { error });
      throw error;
    }
  }

  /**
   * Create Etsy listing
   */
  async createListing(product: any): Promise<number> {
    logger.info(`Creating Etsy listing for product ${product.sku}`);

    try {
      const listingData = {
        quantity: product.stock,
        title: product.name.substring(0, 140), // Etsy title limit
        description: product.description,
        price: (product.price / 100).toFixed(2),
        who_made: 'someone_else',
        when_made: '2020_2024',
        taxonomy_id: product.etsyCategoryId || 1,
        shipping_profile_id: this.credentials.shopId, // Use default shipping profile
        tags: this.extractTags(product.name, product.description),
        materials: product.materials || [],
        is_supply: false,
        is_customizable: false,
        should_auto_renew: true,
        is_taxable: true,
      };

      const response = await this.makeRequest(
        'POST',
        `/application/shops/${this.credentials.shopId}/listings`,
        listingData
      );

      const listingId = response.listing_id;

      // Upload images
      if (product.images && product.images.length > 0) {
        await this.uploadListingImages(listingId, product.images);
      }

      // Set SKU
      await this.makeRequest(
        'PUT',
        `/application/listings/${listingId}/inventory`,
        {
          products: [
            {
              sku: product.sku,
              offerings: [
                {
                  price: (product.price / 100).toFixed(2),
                  quantity: product.stock,
                  is_enabled: true,
                },
              ],
            },
          ],
        }
      );

      // Save Etsy listing ID
      await prisma.product.update({
        where: { id: product.id },
        data: { etsyListingId: listingId },
      });

      logger.info(`Created Etsy listing ${listingId} for product ${product.sku}`);
      return listingId;
    } catch (error) {
      logger.error(`Failed to create Etsy listing for ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Extract tags from product name and description
   */
  private extractTags(name: string, description: string): string[] {
    const words = `${name} ${description}`
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    // Remove duplicates and limit to 13 tags (Etsy limit)
    return [...new Set(words)].slice(0, 13);
  }

  /**
   * Upload images to Etsy listing
   */
  private async uploadListingImages(listingId: number, imageUrls: string[]): Promise<void> {
    try {
      for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
        const imageUrl = imageUrls[i];
        
        // Download image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);

        // Upload to Etsy
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer]), 'image.jpg');
        formData.append('rank', String(i + 1));

        await this.makeRequest(
          'POST',
          `/application/shops/${this.credentials.shopId}/listings/${listingId}/images`,
          formData
        );
      }
    } catch (error) {
      logger.error(`Failed to upload images for listing ${listingId}`, { error });
    }
  }

  /**
   * Update Etsy listing
   */
  async updateListing(product: any): Promise<void> {
    if (!product.etsyListingId) {
      logger.warn(`Product ${product.sku} has no Etsy listing ID`);
      return;
    }

    logger.info(`Updating Etsy listing ${product.etsyListingId}`);

    try {
      await this.makeRequest(
        'PATCH',
        `/application/listings/${product.etsyListingId}`,
        {
          title: product.name.substring(0, 140),
          description: product.description,
          price: (product.price / 100).toFixed(2),
        }
      );

      // Update inventory
      await this.makeRequest(
        'PUT',
        `/application/listings/${product.etsyListingId}/inventory`,
        {
          products: [
            {
              sku: product.sku,
              offerings: [
                {
                  price: (product.price / 100).toFixed(2),
                  quantity: product.stock,
                  is_enabled: product.stock > 0,
                },
              ],
            },
          ],
        }
      );

      await prisma.product.update({
        where: { id: product.id },
        data: { etsyLastSync: new Date() },
      });

      logger.info(`Updated Etsy listing ${product.etsyListingId}`);
    } catch (error) {
      logger.error(`Failed to update Etsy listing ${product.etsyListingId}`, { error });
      throw error;
    }
  }

  /**
   * Import Etsy orders
   */
  async importOrders(): Promise<void> {
    logger.info('Starting Etsy order import');

    try {
      const minCreated = Math.floor((Date.now() - 86400000) / 1000); // Last 24 hours
      const maxCreated = Math.floor(Date.now() / 1000);

      const response = await this.makeRequest(
        'GET',
        `/application/shops/${this.credentials.shopId}/receipts?min_created=${minCreated}&max_created=${maxCreated}&limit=100`
      );

      const receipts = response.results || [];
      logger.info(`Found ${receipts.length} Etsy orders to import`);

      for (const receipt of receipts) {
        await this.importSingleOrder(receipt);
      }

      logger.info('Etsy order import completed');
    } catch (error) {
      logger.error('Etsy order import failed', { error });
      throw error;
    }
  }

  /**
   * Import single Etsy order
   */
  private async importSingleOrder(receipt: any): Promise<void> {
    try {
      const existing = await prisma.order.findFirst({
        where: { etsyReceiptId: receipt.receipt_id },
      });

      if (existing) {
        logger.info(`Order ${receipt.receipt_id} already imported`);
        return;
      }

      // Get order items
      const itemsResponse = await this.makeRequest(
        'GET',
        `/application/shops/${this.credentials.shopId}/receipts/${receipt.receipt_id}/transactions`
      );

      const transactions = itemsResponse.results || [];

      await prisma.order.create({
        data: {
          etsyReceiptId: receipt.receipt_id,
          channel: 'ETSY',
          status: this.mapEtsyStatus(receipt.status),
          total: parseFloat(receipt.grandtotal.amount) * 100,
          currency: receipt.grandtotal.currency_code,
          customerEmail: receipt.buyer_email,
          shippingAddress: {
            create: {
              name: receipt.name,
              street: receipt.first_line,
              city: receipt.city,
              state: receipt.state,
              postalCode: receipt.zip,
              country: receipt.country_iso,
            },
          },
          items: {
            create: transactions.map((transaction: any) => ({
              productId: this.findProductBySku(transaction.product_data?.sku),
              sku: transaction.product_data?.sku || '',
              quantity: transaction.quantity,
              price: parseFloat(transaction.price.amount) * 100,
            })),
          },
        },
      });

      logger.info(`Imported Etsy order ${receipt.receipt_id}`);
    } catch (error) {
      logger.error(`Failed to import Etsy order ${receipt.receipt_id}`, { error });
    }
  }

  /**
   * Sync inventory to Etsy
   */
  async syncInventory(): Promise<void> {
    logger.info('Starting Etsy inventory sync');

    try {
      const products = await prisma.product.findMany({
        where: {
          etsySyncEnabled: true,
          etsyListingId: { not: null },
        },
        select: { id: true, sku: true, etsyListingId: true, stock: true, price: true },
      });

      for (const product of products) {
        await this.makeRequest(
          'PUT',
          `/application/listings/${product.etsyListingId}/inventory`,
          {
            products: [
              {
                sku: product.sku,
                offerings: [
                  {
                    price: (product.price / 100).toFixed(2),
                    quantity: product.stock,
                    is_enabled: product.stock > 0,
                  },
                ],
              },
            ],
          }
        );

        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }

      logger.info('Etsy inventory sync completed');
    } catch (error) {
      logger.error('Etsy inventory sync failed', { error });
      throw error;
    }
  }

  /**
   * Map Etsy order status to internal status
   */
  private mapEtsyStatus(etsyStatus: string): string {
    const statusMap: Record<string, string> = {
      open: 'PENDING',
      processing: 'PROCESSING',
      completed: 'DELIVERED',
      canceled: 'CANCELLED',
    };
    return statusMap[etsyStatus] || 'PENDING';
  }

  /**
   * Find product by SKU
   */
  private async findProductBySku(sku: string): Promise<number | null> {
    const product = await prisma.product.findFirst({
      where: { sku },
      select: { id: true },
    });
    return product?.id || null;
  }

  /**
   * Get shop analytics
   */
  async getShopStats(): Promise<any> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/application/shops/${this.credentials.shopId}/stats`
      );
      return response;
    } catch (error) {
      logger.error('Failed to get Etsy shop stats', { error });
      throw error;
    }
  }
}

/**
 * Background job to sync Etsy data
 */
export async function runEtsySync() {
  try {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'ETSY', enabled: true },
    });

    if (!config) {
      logger.info('Etsy sync not configured');
      return;
    }

    const credentials = config.credentials as EtsyCredentials;
    const sync = new EtsySync(credentials);

    await sync.syncInventory();
    await sync.importOrders();

    logger.info('Etsy sync completed successfully');
  } catch (error) {
    logger.error('Etsy sync failed', { error });
    throw error;
  }
}

export default EtsySync;
