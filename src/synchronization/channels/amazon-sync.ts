/**
 * Amazon Marketplace Synchronization
 * Purpose: Sync products, orders, inventory with Amazon SP-API
 * Description: Complete Amazon integration using Selling Partner API
 */

import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface AmazonCredentials {
  sellerId: string;
  marketplaceId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: 'us-east-1' | 'eu-west-1' | 'us-west-2';
}

interface AmazonProduct {
  asin: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
}

interface AmazonOrder {
  amazonOrderId: string;
  purchaseDate: string;
  orderStatus: string;
  buyerEmail: string;
  shippingAddress: {
    name: string;
    addressLine1: string;
    city: string;
    stateOrRegion: string;
    postalCode: string;
    countryCode: string;
  };
  orderItems: Array<{
    asin: string;
    sku: string;
    title: string;
    quantity: number;
    itemPrice: number;
  }>;
}

export class AmazonSync {
  private credentials: AmazonCredentials;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: AmazonCredentials) {
    this.credentials = credentials;
    this.baseUrl = this.getBaseUrl(credentials.region);
  }

  /**
   * Get Amazon SP-API base URL by region
   */
  private getBaseUrl(region: string): string {
    const urls: Record<string, string> = {
      'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
      'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
      'us-west-2': 'https://sellingpartnerapi-fe.amazon.com',
    };
    return urls[region] || urls['us-east-1'];
  }

  /**
   * Get access token using refresh token
   */
  private async getAccessToken(): Promise<string> {
    // Check if cached token is still valid
    const cached = await redis.get(`amazon:token:${this.credentials.sellerId}`);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      });

      const { access_token, expires_in } = response.data;
      
      // Cache token (expires in 1 hour, cache for 55 minutes)
      await redis.setex(
        `amazon:token:${this.credentials.sellerId}`,
        expires_in - 300,
        access_token
      );

      return access_token;
    } catch (error) {
      logger.error('Failed to get Amazon access token', { error });
      throw new Error('Amazon authentication failed');
    }
  }

  /**
   * Make authenticated request to Amazon SP-API
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'x-amz-access-token': token,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Amazon API request failed', {
        endpoint,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Sync products from BharatCart to Amazon
   */
  async syncProductsToAmazon(): Promise<void> {
    logger.info('Starting Amazon product sync');

    try {
      // Get products that need syncing
      const products = await prisma.product.findMany({
        where: {
          amazonSyncEnabled: true,
          OR: [
            { amazonLastSync: null },
            { amazonLastSync: { lt: new Date(Date.now() - 3600000) } }, // 1 hour
          ],
        },
        include: {
          variants: true,
          category: true,
        },
      });

      logger.info(`Found ${products.length} products to sync to Amazon`);

      for (const product of products) {
        await this.syncSingleProduct(product);
        
        // Rate limiting: Amazon allows 10 requests per second
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Amazon product sync completed');
    } catch (error) {
      logger.error('Amazon product sync failed', { error });
      throw error;
    }
  }

  /**
   * Sync single product to Amazon
   */
  private async syncSingleProduct(product: any): Promise<void> {
    try {
      const feed = {
        messageType: 'Product',
        messages: [
          {
            messageId: product.id,
            sku: product.sku,
            productType: 'PRODUCT',
            requirements: {
              title: product.name,
              description: product.description,
              bulletPoints: product.features?.slice(0, 5) || [],
              brand: product.brand?.name || 'Generic',
              manufacturer: product.brand?.name || 'Generic',
            },
            attributes: {
              mainImage: product.images[0],
              otherImages: product.images.slice(1, 8),
              price: {
                value: product.price / 100,
                currency: 'USD',
              },
              quantity: product.stock,
            },
          },
        ],
      };

      // Submit feed to Amazon
      await this.makeRequest('POST', '/feeds/2021-06-30/feeds', {
        feedType: 'POST_PRODUCT_DATA',
        marketplaceIds: [this.credentials.marketplaceId],
        inputFeedDocumentId: await this.uploadFeedDocument(feed),
      });

      // Update sync timestamp
      await prisma.product.update({
        where: { id: product.id },
        data: { amazonLastSync: new Date() },
      });

      logger.info(`Synced product ${product.sku} to Amazon`);
    } catch (error) {
      logger.error(`Failed to sync product ${product.sku} to Amazon`, { error });
    }
  }

  /**
   * Upload feed document to Amazon
   */
  private async uploadFeedDocument(feed: any): Promise<string> {
    // Create feed document
    const createResponse = await this.makeRequest(
      'POST',
      '/feeds/2021-06-30/documents',
      { contentType: 'application/json' }
    );

    const { feedDocumentId, url } = createResponse;

    // Upload feed content
    await axios.put(url, JSON.stringify(feed), {
      headers: { 'Content-Type': 'application/json' },
    });

    return feedDocumentId;
  }

  /**
   * Import orders from Amazon
   */
  async importOrders(): Promise<void> {
    logger.info('Starting Amazon order import');

    try {
      // Get orders created in last 24 hours
      const createdAfter = new Date(Date.now() - 86400000).toISOString();

      const response = await this.makeRequest(
        'GET',
        `/orders/v0/orders?MarketplaceIds=${this.credentials.marketplaceId}&CreatedAfter=${createdAfter}`
      );

      const orders = response.payload.Orders || [];
      logger.info(`Found ${orders.length} Amazon orders to import`);

      for (const amazonOrder of orders) {
        await this.importSingleOrder(amazonOrder);
      }

      logger.info('Amazon order import completed');
    } catch (error) {
      logger.error('Amazon order import failed', { error });
      throw error;
    }
  }

  /**
   * Import single order from Amazon
   */
  private async importSingleOrder(amazonOrder: any): Promise<void> {
    try {
      // Check if order already exists
      const existing = await prisma.order.findFirst({
        where: { amazonOrderId: amazonOrder.AmazonOrderId },
      });

      if (existing) {
        logger.info(`Order ${amazonOrder.AmazonOrderId} already imported`);
        return;
      }

      // Get order items
      const itemsResponse = await this.makeRequest(
        'GET',
        `/orders/v0/orders/${amazonOrder.AmazonOrderId}/orderItems`
      );

      const orderItems = itemsResponse.payload.OrderItems || [];

      // Create order in database
      await prisma.order.create({
        data: {
          amazonOrderId: amazonOrder.AmazonOrderId,
          channel: 'AMAZON',
          status: this.mapAmazonStatus(amazonOrder.OrderStatus),
          total: parseFloat(amazonOrder.OrderTotal.Amount) * 100, // Convert to cents
          currency: amazonOrder.OrderTotal.CurrencyCode,
          customerEmail: amazonOrder.BuyerInfo?.BuyerEmail || '',
          shippingAddress: {
            create: {
              name: amazonOrder.ShippingAddress.Name,
              street: amazonOrder.ShippingAddress.AddressLine1,
              city: amazonOrder.ShippingAddress.City,
              state: amazonOrder.ShippingAddress.StateOrRegion,
              postalCode: amazonOrder.ShippingAddress.PostalCode,
              country: amazonOrder.ShippingAddress.CountryCode,
            },
          },
          items: {
            create: orderItems.map((item: any) => ({
              productId: this.findProductBySku(item.SellerSKU),
              sku: item.SellerSKU,
              quantity: item.QuantityOrdered,
              price: parseFloat(item.ItemPrice.Amount) * 100,
            })),
          },
        },
      });

      logger.info(`Imported Amazon order ${amazonOrder.AmazonOrderId}`);
    } catch (error) {
      logger.error(`Failed to import Amazon order ${amazonOrder.AmazonOrderId}`, { error });
    }
  }

  /**
   * Sync inventory levels with Amazon
   */
  async syncInventory(): Promise<void> {
    logger.info('Starting Amazon inventory sync');

    try {
      const products = await prisma.product.findMany({
        where: { amazonSyncEnabled: true },
        select: { id: true, sku: true, stock: true },
      });

      const inventoryFeed = {
        messageType: 'Inventory',
        messages: products.map(product => ({
          messageId: product.id,
          sku: product.sku,
          quantity: product.stock,
          fulfillmentLatency: 2, // Days to ship
        })),
      };

      const documentId = await this.uploadFeedDocument(inventoryFeed);

      await this.makeRequest('POST', '/feeds/2021-06-30/feeds', {
        feedType: 'POST_INVENTORY_AVAILABILITY_DATA',
        marketplaceIds: [this.credentials.marketplaceId],
        inputFeedDocumentId: documentId,
      });

      logger.info('Amazon inventory sync completed');
    } catch (error) {
      logger.error('Amazon inventory sync failed', { error });
      throw error;
    }
  }

  /**
   * Map Amazon order status to internal status
   */
  private mapAmazonStatus(amazonStatus: string): string {
    const statusMap: Record<string, string> = {
      Pending: 'PENDING',
      Unshipped: 'PROCESSING',
      PartiallyShipped: 'PROCESSING',
      Shipped: 'SHIPPED',
      Canceled: 'CANCELLED',
      Unfulfillable: 'CANCELLED',
    };
    return statusMap[amazonStatus] || 'PENDING';
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
   * Get Amazon reports (sales, traffic, etc.)
   */
  async getReports(reportType: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Request report
      const reportResponse = await this.makeRequest(
        'POST',
        '/reports/2021-06-30/reports',
        {
          reportType,
          marketplaceIds: [this.credentials.marketplaceId],
          dataStartTime: startDate.toISOString(),
          dataEndTime: endDate.toISOString(),
        }
      );

      const reportId = reportResponse.reportId;

      // Poll for report completion
      let reportDocument = null;
      for (let i = 0; i < 30; i++) {
        const statusResponse = await this.makeRequest(
          'GET',
          `/reports/2021-06-30/reports/${reportId}`
        );

        if (statusResponse.processingStatus === 'DONE') {
          reportDocument = statusResponse.reportDocumentId;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!reportDocument) {
        throw new Error('Report generation timeout');
      }

      // Download report
      const downloadResponse = await this.makeRequest(
        'GET',
        `/reports/2021-06-30/documents/${reportDocument}`
      );

      const reportContent = await axios.get(downloadResponse.url);

      return reportContent.data;
    } catch (error) {
      logger.error('Failed to get Amazon report', { reportType, error });
      throw error;
    }
  }
}

/**
 * Background job to sync Amazon data
 */
export async function runAmazonSync() {
  try {
    // Get Amazon credentials from database
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'AMAZON', enabled: true },
    });

    if (!config) {
      logger.info('Amazon sync not configured');
      return;
    }

    const credentials = config.credentials as AmazonCredentials;
    const sync = new AmazonSync(credentials);

    // Sync in order: Inventory -> Products -> Orders
    await sync.syncInventory();
    await sync.syncProductsToAmazon();
    await sync.importOrders();

    logger.info('Amazon sync completed successfully');
  } catch (error) {
    logger.error('Amazon sync failed', { error });
    throw error;
  }
}

export default AmazonSync;
