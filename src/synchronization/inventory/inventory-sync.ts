/**
 * Inventory Synchronization
 * Purpose: Sync inventory across all channels
 * Description: Central inventory management and multi-channel sync
 */

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { AmazonSync } from '../channels/amazon-sync';
import { EbaySync } from '../channels/ebay-sync';
import { EtsySync } from '../channels/etsy-sync';
import { WalmartSync } from '../channels/walmart-sync';

interface InventoryUpdate {
  productId: number;
  sku: string;
  quantity: number;
  location?: string;
  reason?: string;
}

interface ChannelInventory {
  channel: string;
  sku: string;
  quantity: number;
  lastSynced: Date;
}

export class InventorySync {
  /**
   * Update inventory for a product
   */
  async updateInventory(update: InventoryUpdate): Promise<void> {
    logger.info(`Updating inventory for SKU ${update.sku}`, { update });

    try {
      // Update local inventory
      const product = await prisma.product.update({
        where: { id: update.productId },
        data: {
          stock: update.quantity,
          inventoryHistory: {
            create: {
              quantity: update.quantity,
              change: update.quantity,
              reason: update.reason || 'Manual update',
              location: update.location || 'Main warehouse',
            },
          },
        },
        include: {
          amazonSyncEnabled: true,
          ebaySyncEnabled: true,
          etsySyncEnabled: true,
          walmartSyncEnabled: true,
        },
      });

      // Sync to all enabled channels
      await this.syncToChannels(product);

      // Invalidate cache
      await redis.del(`product:${update.productId}:inventory`);

      logger.info(`Inventory updated successfully for SKU ${update.sku}`);
    } catch (error) {
      logger.error(`Failed to update inventory for SKU ${update.sku}`, { error });
      throw error;
    }
  }

  /**
   * Sync inventory to all enabled channels
   */
  private async syncToChannels(product: any): Promise<void> {
    const syncPromises: Promise<void>[] = [];

    // Amazon
    if (product.amazonSyncEnabled) {
      syncPromises.push(this.syncToAmazon(product));
    }

    // eBay
    if (product.ebaySyncEnabled) {
      syncPromises.push(this.syncToEbay(product));
    }

    // Etsy
    if (product.etsySyncEnabled) {
      syncPromises.push(this.syncToEtsy(product));
    }

    // Walmart
    if (product.walmartSyncEnabled) {
      syncPromises.push(this.syncToWalmart(product));
    }

    await Promise.allSettled(syncPromises);
  }

  /**
   * Sync to Amazon
   */
  private async syncToAmazon(product: any): Promise<void> {
    try {
      const config = await this.getChannelConfig('AMAZON');
      if (!config) return;

      const sync = new AmazonSync(config.credentials);
      await sync.syncInventory();

      await this.recordChannelSync('AMAZON', product.sku, product.stock);
    } catch (error) {
      logger.error('Failed to sync inventory to Amazon', { sku: product.sku, error });
    }
  }

  /**
   * Sync to eBay
   */
  private async syncToEbay(product: any): Promise<void> {
    try {
      const config = await this.getChannelConfig('EBAY');
      if (!config) return;

      const sync = new EbaySync(config.credentials);
      await sync.syncInventory();

      await this.recordChannelSync('EBAY', product.sku, product.stock);
    } catch (error) {
      logger.error('Failed to sync inventory to eBay', { sku: product.sku, error });
    }
  }

  /**
   * Sync to Etsy
   */
  private async syncToEtsy(product: any): Promise<void> {
    try {
      const config = await this.getChannelConfig('ETSY');
      if (!config) return;

      const sync = new EtsySync(config.credentials);
      await sync.syncInventory();

      await this.recordChannelSync('ETSY', product.sku, product.stock);
    } catch (error) {
      logger.error('Failed to sync inventory to Etsy', { sku: product.sku, error });
    }
  }

  /**
   * Sync to Walmart
   */
  private async syncToWalmart(product: any): Promise<void> {
    try {
      const config = await this.getChannelConfig('WALMART');
      if (!config) return;

      const sync = new WalmartSync(config.credentials);
      await sync.updateInventory();

      await this.recordChannelSync('WALMART', product.sku, product.stock);
    } catch (error) {
      logger.error('Failed to sync inventory to Walmart', { sku: product.sku, error });
    }
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
   * Record channel sync
   */
  private async recordChannelSync(
    channel: string,
    sku: string,
    quantity: number
  ): Promise<void> {
    await prisma.channelInventorySync.create({
      data: {
        channel,
        sku,
        quantity,
        syncedAt: new Date(),
      },
    });
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(updates: InventoryUpdate[]): Promise<void> {
    logger.info(`Bulk updating inventory for ${updates.length} products`);

    try {
      for (const update of updates) {
        await this.updateInventory(update);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Bulk inventory update completed');
    } catch (error) {
      logger.error('Bulk inventory update failed', { error });
      throw error;
    }
  }

  /**
   * Reserve inventory for order
   */
  async reserveInventory(orderId: number, items: any[]): Promise<void> {
    logger.info(`Reserving inventory for order ${orderId}`);

    try {
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            reservedStock: { increment: item.quantity },
            inventoryHistory: {
              create: {
                quantity: -item.quantity,
                change: -item.quantity,
                reason: `Reserved for order ${orderId}`,
                orderId,
              },
            },
          },
        });
      }

      logger.info(`Reserved inventory for order ${orderId}`);
    } catch (error) {
      logger.error(`Failed to reserve inventory for order ${orderId}`, { error });
      throw error;
    }
  }

  /**
   * Release reserved inventory
   */
  async releaseInventory(orderId: number): Promise<void> {
    logger.info(`Releasing inventory for order ${orderId}`);

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            reservedStock: { decrement: item.quantity },
            inventoryHistory: {
              create: {
                quantity: item.quantity,
                change: item.quantity,
                reason: `Released from cancelled order ${orderId}`,
                orderId,
              },
            },
          },
        });
      }

      logger.info(`Released inventory for order ${orderId}`);
    } catch (error) {
      logger.error(`Failed to release inventory for order ${orderId}`, { error });
      throw error;
    }
  }

  /**
   * Get inventory across all channels
   */
  async getChannelInventory(sku: string): Promise<ChannelInventory[]> {
    try {
      const syncs = await prisma.channelInventorySync.findMany({
        where: { sku },
        orderBy: { syncedAt: 'desc' },
        distinct: ['channel'],
        take: 4, // Amazon, eBay, Etsy, Walmart
      });

      return syncs.map(sync => ({
        channel: sync.channel,
        sku: sync.sku,
        quantity: sync.quantity,
        lastSynced: sync.syncedAt,
      }));
    } catch (error) {
      logger.error(`Failed to get channel inventory for ${sku}`, { error });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold: number = 10): Promise<any[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          stock: { lte: threshold },
          isActive: true,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          reservedStock: true,
        },
        orderBy: { stock: 'asc' },
      });

      return products;
    } catch (error) {
      logger.error('Failed to get low stock products', { error });
      throw error;
    }
  }

  /**
   * Get inventory value
   */
  async getInventoryValue(): Promise<number> {
    try {
      const result = await prisma.product.aggregate({
        _sum: {
          stock: true,
        },
        where: {
          isActive: true,
        },
      });

      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, costPrice: true },
      });

      const totalValue = products.reduce(
        (sum, product) => sum + product.stock * (product.costPrice || 0),
        0
      );

      return totalValue;
    } catch (error) {
      logger.error('Failed to calculate inventory value', { error });
      throw error;
    }
  }
}

/**
 * Background job to sync inventory across all channels
 */
export async function runInventorySync() {
  try {
    const inventorySync = new InventorySync();

    // Get all products that need syncing
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { amazonSyncEnabled: true },
          { ebaySyncEnabled: true },
          { etsySyncEnabled: true },
          { walmartSyncEnabled: true },
        ],
      },
    });

    logger.info(`Syncing inventory for ${products.length} products`);

    for (const product of products) {
      await inventorySync.updateInventory({
        productId: product.id,
        sku: product.sku,
        quantity: product.stock,
        reason: 'Scheduled sync',
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    logger.info('Inventory sync completed');
  } catch (error) {
    logger.error('Inventory sync failed', { error });
    throw error;
  }
}

export default InventorySync;
