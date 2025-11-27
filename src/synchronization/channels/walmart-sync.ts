/**
 * Walmart Marketplace Synchronization
 * Purpose: Sync products, orders, inventory with Walmart Marketplace API
 * Description: Complete Walmart integration using Marketplace API v3
 */

import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface WalmartCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'production' | 'sandbox';
}

interface WalmartItem {
  sku: string;
  productName: string;
  productIdType: 'UPC' | 'GTIN' | 'ISBN';
  productId: string;
  price: number;
  currency: 'USD';
  shelf: string;
  productCategory: string;
  shortDescription: string;
  mainImageUrl: string;
  additionalImageUrls: string[];
  brand: string;
  manufacturer: string;
  shippingWeight: number;
}

export class WalmartSync {
  private credentials: WalmartCredentials;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentials: WalmartCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.environment === 'production'
      ? 'https://marketplace.walmartapis.com/v3'
      : 'https://sandbox.walmartapis.com/v3';
  }

  /**
   * Get Walmart access token
   */
  private async getAccessToken(): Promise<string> {
    const cached = await redis.get(`walmart:token:${this.credentials.clientId}`);
    if (cached) return cached;

    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const credentials = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 900; // 15 minutes default

      await redis.setex(
        `walmart:token:${this.credentials.clientId}`,
        expiresIn - 60,
        token
      );

      return token;
    } catch (error) {
      logger.error('Failed to get Walmart access token', { error });
      throw new Error('Walmart authentication failed');
    }
  }

  /**
   * Generate request signature for Walmart API
   */
  private generateSignature(timestamp: number): string {
    const message = `${this.credentials.clientId}
${timestamp}
`;
    return crypto
      .createHmac('sha256', this.credentials.clientSecret)
      .update(message)
      .digest('base64');
  }

  /**
   * Make Walmart API request
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const token = await this.getAccessToken();
    const timestamp = Date.now();

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'WM_SVC.NAME': 'Walmart Marketplace',
          'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
          'WM_SEC.TIMESTAMP': timestamp.toString(),
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Walmart API request failed', {
        endpoint,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Create Walmart item
   */
  async createItem(product: any): Promise<void> {
    logger.info(`Creating Walmart item for product ${product.sku}`);

    try {
      const itemData = {
        MPItem: {
          sku: product.sku,
          productName: product.name,
          productIdType: 'GTIN',
          productId: product.gtin || product.upc || '00000000000000',
          productCategory: product.category?.name || 'Other',
          shortDescription: product.description.substring(0, 4000),
          mainImageUrl: product.images[0],
          additionalImages: {
            additionalImageUrl: product.images.slice(1, 8),
          },
          brand: product.brand?.name || 'Generic',
          manufacturer: product.brand?.name || 'Generic',
          manufacturerPartNumber: product.sku,
          price: {
            amount: (product.price / 100).toFixed(2),
            currency: 'USD',
          },
          shippingWeight: {
            value: product.weight || '1',
            unit: 'lb',
          },
          productTaxCode: '2038490',
          shelf: product.shelf || 'Electronics',
          ShippingTemplates: {
            ShippingTemplate: {
              shipMethod: 'Standard',
              shipRegion: 'US48',
              shipPrice: {
                amount: '0.00',
                currency: 'USD',
              },
            },
          },
        },
      };

      await this.makeRequest('POST', '/items', itemData);

      await prisma.product.update({
        where: { id: product.id },
        data: { walmartSku: product.sku },
      });

      logger.info(`Created Walmart item ${product.sku}`);
    } catch (error) {
      logger.error(`Failed to create Walmart item ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Update Walmart item
   */
  async updateItem(product: any): Promise<void> {
    logger.info(`Updating Walmart item ${product.sku}`);

    try {
      const updateData = {
        MPItem: {
          sku: product.sku,
          productName: product.name,
          shortDescription: product.description.substring(0, 4000),
          price: {
            amount: (product.price / 100).toFixed(2),
            currency: 'USD',
          },
        },
      };

      await this.makeRequest('PUT', `/items/${product.sku}`, updateData);

      await prisma.product.update({
        where: { id: product.id },
        data: { walmartLastSync: new Date() },
      });

      logger.info(`Updated Walmart item ${product.sku}`);
    } catch (error) {
      logger.error(`Failed to update Walmart item ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Retire Walmart item
   */
  async retireItem(sku: string): Promise<void> {
    logger.info(`Retiring Walmart item ${sku}`);

    try {
      await this.makeRequest('DELETE', `/items/${sku}`);
      logger.info(`Retired Walmart item ${sku}`);
    } catch (error) {
      logger.error(`Failed to retire Walmart item ${sku}`, { error });
      throw error;
    }
  }

  /**
   * Import Walmart orders
   */
  async importOrders(): Promise<void> {
    logger.info('Starting Walmart order import');

    try {
      const createdStartDate = new Date(Date.now() - 86400000).toISOString();

      const response = await this.makeRequest(
        'GET',
        `/orders?createdStartDate=${createdStartDate}&limit=200`
      );

      const orders = response.list?.elements?.order || [];
      logger.info(`Found ${orders.length} Walmart orders to import`);

      for (const walmartOrder of orders) {
        await this.importSingleOrder(walmartOrder);
      }

      logger.info('Walmart order import completed');
    } catch (error) {
      logger.error('Walmart order import failed', { error });
      throw error;
    }
  }

  /**
   * Import single Walmart order
   */
  private async importSingleOrder(walmartOrder: any): Promise<void> {
    try {
      const existing = await prisma.order.findFirst({
        where: { walmartOrderId: walmartOrder.purchaseOrderId },
      });

      if (existing) {
        logger.info(`Order ${walmartOrder.purchaseOrderId} already imported`);
        return;
      }

      const orderLines = Array.isArray(walmartOrder.orderLines.orderLine)
        ? walmartOrder.orderLines.orderLine
        : [walmartOrder.orderLines.orderLine];

      await prisma.order.create({
        data: {
          walmartOrderId: walmartOrder.purchaseOrderId,
          channel: 'WALMART',
          status: this.mapWalmartStatus(walmartOrder.orderLines.orderLine[0].orderLineStatuses.orderLineStatus[0].status),
          total: parseFloat(walmartOrder.orderLines.orderLine[0].charges.charge[0].chargeAmount.amount) * 100,
          currency: walmartOrder.orderLines.orderLine[0].charges.charge[0].chargeAmount.currency,
          customerEmail: walmartOrder.customerEmailId || '',
          shippingAddress: {
            create: {
              name: walmartOrder.shippingInfo.postalAddress.name,
              street: walmartOrder.shippingInfo.postalAddress.address1,
              city: walmartOrder.shippingInfo.postalAddress.city,
              state: walmartOrder.shippingInfo.postalAddress.state,
              postalCode: walmartOrder.shippingInfo.postalAddress.postalCode,
              country: walmartOrder.shippingInfo.postalAddress.country,
            },
          },
          items: {
            create: orderLines.map((line: any) => ({
              productId: this.findProductBySku(line.item.sku),
              sku: line.item.sku,
              quantity: line.orderLineQuantity.amount,
              price: parseFloat(line.charges.charge[0].chargeAmount.amount) * 100,
            })),
          },
        },
      });

      logger.info(`Imported Walmart order ${walmartOrder.purchaseOrderId}`);
    } catch (error) {
      logger.error(`Failed to import Walmart order ${walmartOrder.purchaseOrderId}`, { error });
    }
  }

  /**
   * Update inventory on Walmart
   */
  async updateInventory(): Promise<void> {
    logger.info('Starting Walmart inventory update');

    try {
      const products = await prisma.product.findMany({
        where: {
          walmartSyncEnabled: true,
          walmartSku: { not: null },
        },
        select: { walmartSku: true, stock: true },
      });

      const inventoryData = {
        inventory: {
          sku: products.map(p => ({
            sku: p.walmartSku,
            quantity: {
              unit: 'EACH',
              amount: p.stock,
            },
          })),
        },
      };

      await this.makeRequest('PUT', '/inventory', inventoryData);

      logger.info('Walmart inventory update completed');
    } catch (error) {
      logger.error('Walmart inventory update failed', { error });
      throw error;
    }
  }

  /**
   * Acknowledge Walmart order
   */
  async acknowledgeOrder(purchaseOrderId: string): Promise<void> {
    try {
      await this.makeRequest('POST', `/orders/${purchaseOrderId}/acknowledge`);
      logger.info(`Acknowledged Walmart order ${purchaseOrderId}`);
    } catch (error) {
      logger.error(`Failed to acknowledge order ${purchaseOrderId}`, { error });
      throw error;
    }
  }

  /**
   * Ship Walmart order
   */
  async shipOrder(purchaseOrderId: string, trackingInfo: any): Promise<void> {
    try {
      const shipmentData = {
        orderShipment: {
          orderLines: {
            orderLine: trackingInfo.items.map((item: any) => ({
              lineNumber: item.lineNumber,
              orderLineStatuses: {
                orderLineStatus: [
                  {
                    status: 'Shipped',
                    statusQuantity: {
                      unitOfMeasurement: 'EACH',
                      amount: item.quantity,
                    },
                    trackingInfo: {
                      shipDateTime: new Date().toISOString(),
                      carrierName: {
                        carrier: trackingInfo.carrier,
                      },
                      methodCode: trackingInfo.method,
                      trackingNumber: trackingInfo.trackingNumber,
                    },
                  },
                ],
              },
            })),
          },
        },
      };

      await this.makeRequest('POST', `/orders/${purchaseOrderId}/shipping`, shipmentData);
      logger.info(`Shipped Walmart order ${purchaseOrderId}`);
    } catch (error) {
      logger.error(`Failed to ship order ${purchaseOrderId}`, { error });
      throw error;
    }
  }

  /**
   * Map Walmart order status to internal status
   */
  private mapWalmartStatus(walmartStatus: string): string {
    const statusMap: Record<string, string> = {
      Created: 'PENDING',
      Acknowledged: 'PROCESSING',
      Shipped: 'SHIPPED',
      Delivered: 'DELIVERED',
      Cancelled: 'CANCELLED',
    };
    return statusMap[walmartStatus] || 'PENDING';
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
   * Get item performance metrics
   */
  async getItemPerformance(sku: string): Promise<any> {
    try {
      const response = await this.makeRequest('GET', `/insights/items/${sku}/performance`);
      return response;
    } catch (error) {
      logger.error(`Failed to get performance for ${sku}`, { error });
      throw error;
    }
  }
}

/**
 * Background job to sync Walmart data
 */
export async function runWalmartSync() {
  try {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'WALMART', enabled: true },
    });

    if (!config) {
      logger.info('Walmart sync not configured');
      return;
    }

    const credentials = config.credentials as WalmartCredentials;
    const sync = new WalmartSync(credentials);

    await sync.updateInventory();
    await sync.importOrders();

    logger.info('Walmart sync completed successfully');
  } catch (error) {
    logger.error('Walmart sync failed', { error });
    throw error;
  }
}

export default WalmartSync;
