/**
 * Order Import System
 * Purpose: Import orders from all marketplace channels
 * Description: Unified order import with normalization and processing
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { AmazonSync } from '../channels/amazon-sync';
import { EbaySync } from '../channels/ebay-sync';
import { EtsySync } from '../channels/etsy-sync';
import { WalmartSync } from '../channels/walmart-sync';

interface ImportedOrder {
  externalId: string;
  channel: 'AMAZON' | 'EBAY' | 'ETSY' | 'WALMART' | 'SHOPIFY';
  status: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: Address;
  billingAddress?: Address;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  paymentMethod: string;
  purchaseDate: Date;
  metadata?: Record<string, any>;
}

interface Address {
  name: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface OrderItem {
  sku: string;
  productName: string;
  quantity: number;
  price: number;
  tax?: number;
}

export class OrderImport {
  /**
   * Import orders from all channels
   */
  async importAllOrders(): Promise<void> {
    logger.info('Starting order import from all channels');

    try {
      const importPromises = [
        this.importAmazonOrders(),
        this.importEbayOrders(),
        this.importEtsyOrders(),
        this.importWalmartOrders(),
      ];

      const results = await Promise.allSettled(importPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Order import completed. Success: ${successful}, Failed: ${failed}`);
    } catch (error) {
      logger.error('Order import failed', { error });
      throw error;
    }
  }

  /**
   * Import Amazon orders
   */
  private async importAmazonOrders(): Promise<void> {
    logger.info('Importing Amazon orders');

    try {
      const config = await this.getChannelConfig('AMAZON');
      if (!config) {
        logger.info('Amazon not configured, skipping');
        return;
      }

      const sync = new AmazonSync(config.credentials);
      await sync.importOrders();

      logger.info('Amazon orders imported successfully');
    } catch (error) {
      logger.error('Failed to import Amazon orders', { error });
      throw error;
    }
  }

  /**
   * Import eBay orders
   */
  private async importEbayOrders(): Promise<void> {
    logger.info('Importing eBay orders');

    try {
      const config = await this.getChannelConfig('EBAY');
      if (!config) {
        logger.info('eBay not configured, skipping');
        return;
      }

      const sync = new EbaySync(config.credentials);
      await sync.importOrders();

      logger.info('eBay orders imported successfully');
    } catch (error) {
      logger.error('Failed to import eBay orders', { error });
      throw error;
    }
  }

  /**
   * Import Etsy orders
   */
  private async importEtsyOrders(): Promise<void> {
    logger.info('Importing Etsy orders');

    try {
      const config = await this.getChannelConfig('ETSY');
      if (!config) {
        logger.info('Etsy not configured, skipping');
        return;
      }

      const sync = new EtsySync(config.credentials);
      await sync.importOrders();

      logger.info('Etsy orders imported successfully');
    } catch (error) {
      logger.error('Failed to import Etsy orders', { error });
      throw error;
    }
  }

  /**
   * Import Walmart orders
   */
  private async importWalmartOrders(): Promise<void> {
    logger.info('Importing Walmart orders');

    try {
      const config = await this.getChannelConfig('WALMART');
      if (!config) {
        logger.info('Walmart not configured, skipping');
        return;
      }

      const sync = new WalmartSync(config.credentials);
      await sync.importOrders();

      logger.info('Walmart orders imported successfully');
    } catch (error) {
      logger.error('Failed to import Walmart orders', { error });
      throw error;
    }
  }

  /**
   * Normalize and save order
   */
  async normalizeAndSaveOrder(importedOrder: ImportedOrder): Promise<number> {
    logger.info(`Normalizing order ${importedOrder.externalId} from ${importedOrder.channel}`);

    try {
      // Check if order already exists
      const existing = await this.checkExistingOrder(
        importedOrder.channel,
        importedOrder.externalId
      );

      if (existing) {
        logger.info(`Order ${importedOrder.externalId} already exists, skipping`);
        return existing.id;
      }

      // Find or create customer
      const customer = await this.findOrCreateCustomer(importedOrder);

      // Map products
      const orderItems = await this.mapOrderItems(importedOrder.items);

      // Create order
      const order = await prisma.order.create({
        data: {
          externalOrderId: importedOrder.externalId,
          channel: importedOrder.channel,
          status: this.normalizeStatus(importedOrder.status),
          customerId: customer.id,
          customerEmail: importedOrder.customerEmail,
          shippingAddress: {
            create: this.normalizeAddress(importedOrder.shippingAddress),
          },
          billingAddress: importedOrder.billingAddress
            ? {
                create: this.normalizeAddress(importedOrder.billingAddress),
              }
            : undefined,
          items: {
            create: orderItems,
          },
          subtotal: Math.round(importedOrder.subtotal * 100), // Convert to cents
          tax: Math.round(importedOrder.tax * 100),
          shipping: Math.round(importedOrder.shipping * 100),
          total: Math.round(importedOrder.total * 100),
          currency: importedOrder.currency,
          paymentMethod: importedOrder.paymentMethod,
          paymentStatus: 'PAID',
          purchasedAt: importedOrder.purchaseDate,
          metadata: importedOrder.metadata || {},
        },
        include: {
          items: true,
        },
      });

      // Reserve inventory
      await this.reserveInventory(order.id, orderItems);

      // Send notification
      await this.sendOrderNotification(order);

      logger.info(`Order ${importedOrder.externalId} saved successfully as ID ${order.id}`);
      return order.id;
    } catch (error) {
      logger.error(`Failed to normalize order ${importedOrder.externalId}`, { error });
      throw error;
    }
  }

  /**
   * Check if order already exists
   */
  private async checkExistingOrder(
    channel: string,
    externalId: string
  ): Promise<any | null> {
    const fieldMap: Record<string, string> = {
      AMAZON: 'amazonOrderId',
      EBAY: 'ebayOrderId',
      ETSY: 'etsyReceiptId',
      WALMART: 'walmartOrderId',
    };

    const field = fieldMap[channel];
    if (!field) return null;

    return await prisma.order.findFirst({
      where: { [field]: externalId },
    });
  }

  /**
   * Find or create customer
   */
  private async findOrCreateCustomer(order: ImportedOrder): Promise<any> {
    let customer = await prisma.user.findUnique({
      where: { email: order.customerEmail },
    });

    if (!customer) {
      customer = await prisma.user.create({
        data: {
          email: order.customerEmail,
          name: order.customerName || order.shippingAddress.name,
          role: 'CUSTOMER',
          isVerified: true, // Marketplace customers are pre-verified
        },
      });
    }

    return customer;
  }

  /**
   * Map order items to database format
   */
  private async mapOrderItems(items: OrderItem[]): Promise<any[]> {
    const mappedItems = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { sku: item.sku },
        select: { id: true, name: true, price: true },
      });

      if (!product) {
        logger.warn(`Product not found for SKU ${item.sku}, using item data`);
        mappedItems.push({
          sku: item.sku,
          name: item.productName,
          quantity: item.quantity,
          price: Math.round(item.price * 100),
          tax: Math.round((item.tax || 0) * 100),
        });
      } else {
        mappedItems.push({
          productId: product.id,
          sku: item.sku,
          name: product.name,
          quantity: item.quantity,
          price: Math.round(item.price * 100),
          tax: Math.round((item.tax || 0) * 100),
        });
      }
    }

    return mappedItems;
  }

  /**
   * Normalize address
   */
  private normalizeAddress(address: Address): any {
    return {
      name: address.name,
      street: address.street,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    };
  }

  /**
   * Normalize order status
   */
  private normalizeStatus(externalStatus: string): string {
    const statusMap: Record<string, string> = {
      // Amazon
      Pending: 'PENDING',
      Unshipped: 'PROCESSING',
      PartiallyShipped: 'PROCESSING',
      Shipped: 'SHIPPED',
      Canceled: 'CANCELLED',
      Unfulfillable: 'CANCELLED',
      // eBay
      Active: 'PENDING',
      Completed: 'DELIVERED',
      // Etsy
      open: 'PENDING',
      processing: 'PROCESSING',
      completed: 'DELIVERED',
      canceled: 'CANCELLED',
      // Walmart
      Created: 'PENDING',
      Acknowledged: 'PROCESSING',
      Delivered: 'DELIVERED',
    };

    return statusMap[externalStatus] || 'PENDING';
  }

  /**
   * Reserve inventory for order
   */
  private async reserveInventory(orderId: number, items: any[]): Promise<void> {
    for (const item of items) {
      if (!item.productId) continue;

      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          reservedStock: { increment: item.quantity },
        },
      });
    }
  }

  /**
   * Send order notification
   */
  private async sendOrderNotification(order: any): Promise<void> {
    // Queue email notification
    await redis.lpush(
      'email:queue',
      JSON.stringify({
        type: 'order_received',
        to: order.customerEmail,
        data: {
          orderId: order.id,
          externalOrderId: order.externalOrderId,
          total: order.total / 100,
          currency: order.currency,
        },
      })
    );
  }

  /**
   * Get channel configuration
   */
  private async getChannelConfig(platform: string): Promise<any> {
    return await prisma.integrationConfig.findFirst({
      where: { platform, enabled: true },
    });
  }

  /**
   * Get import statistics
   */
  async getImportStats(days: number = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 86400000);

    const stats = await prisma.order.groupBy({
      by: ['channel'],
      where: {
        createdAt: { gte: startDate },
        channel: { not: 'WEBSITE' },
      },
      _count: { id: true },
      _sum: { total: true },
    });

    return stats.map(stat => ({
      channel: stat.channel,
      orderCount: stat._count.id,
      totalRevenue: (stat._sum.total || 0) / 100,
    }));
  }

  /**
   * Handle failed order import
   */
  async logFailedImport(
    channel: string,
    externalId: string,
    error: any
  ): Promise<void> {
    await prisma.failedOrderImport.create({
      data: {
        channel,
        externalOrderId: externalId,
        errorMessage: error.message,
        errorStack: error.stack,
        retryCount: 0,
      },
    });
  }

  /**
   * Retry failed imports
   */
  async retryFailedImports(): Promise<void> {
    const failed = await prisma.failedOrderImport.findMany({
      where: {
        retryCount: { lt: 3 },
        resolved: false,
      },
      take: 10,
    });

    for (const failedImport of failed) {
      try {
        // Retry import based on channel
        logger.info(`Retrying import for ${failedImport.channel} order ${failedImport.externalOrderId}`);

        // Increment retry count
        await prisma.failedOrderImport.update({
          where: { id: failedImport.id },
          data: { retryCount: { increment: 1 } },
        });
      } catch (error) {
        logger.error(`Retry failed for ${failedImport.externalOrderId}`, { error });
      }
    }
  }
}

/**
 * Background job to import orders
 */
export async function runOrderImport() {
  try {
    const orderImport = new OrderImport();
    await orderImport.importAllOrders();
    await orderImport.retryFailedImports();

    logger.info('Order import job completed successfully');
  } catch (error) {
    logger.error('Order import job failed', { error });
    throw error;
  }
}

export default OrderImport;
