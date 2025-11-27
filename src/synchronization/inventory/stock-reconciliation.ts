/**
 * Stock Reconciliation
 * Purpose: Reconcile inventory discrepancies across channels
 * Description: Detect and fix inventory sync issues
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AmazonSync } from '../channels/amazon-sync';
import { EbaySync } from '../channels/ebay-sync';
import { EtsySync } from '../channels/etsy-sync';
import { WalmartSync } from '../channels/walmart-sync';

interface ReconciliationResult {
  sku: string;
  localStock: number;
  channelStocks: Record<string, number>;
  discrepancies: string[];
  resolved: boolean;
}

interface StockDiscrepancy {
  sku: string;
  channel: string;
  localQuantity: number;
  channelQuantity: number;
  difference: number;
}

export class StockReconciliation {
  /**
   * Reconcile stock for all products
   */
  async reconcileAll(): Promise<ReconciliationResult[]> {
    logger.info('Starting stock reconciliation for all products');

    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { amazonSyncEnabled: true },
            { ebaySyncEnabled: true },
            { etsySyncEnabled: true },
            { walmartSyncEnabled: true },
          ],
        },
        select: {
          id: true,
          sku: true,
          stock: true,
          amazonSyncEnabled: true,
          amazonItemId: true,
          ebaySyncEnabled: true,
          ebayItemId: true,
          etsySyncEnabled: true,
          etsyListingId: true,
          walmartSyncEnabled: true,
          walmartSku: true,
        },
      });

      const results: ReconciliationResult[] = [];

      for (const product of products) {
        const result = await this.reconcileProduct(product);
        results.push(result);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info(`Stock reconciliation completed. Checked ${results.length} products`);
      return results;
    } catch (error) {
      logger.error('Stock reconciliation failed', { error });
      throw error;
    }
  }

  /**
   * Reconcile stock for single product
   */
  async reconcileProduct(product: any): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      sku: product.sku,
      localStock: product.stock,
      channelStocks: {},
      discrepancies: [],
      resolved: false,
    };

    try {
      // Get stock from each channel
      if (product.amazonSyncEnabled && product.amazonItemId) {
        result.channelStocks.amazon = await this.getAmazonStock(product.sku);
      }

      if (product.ebaySyncEnabled && product.ebayItemId) {
        result.channelStocks.ebay = await this.getEbayStock(product.ebayItemId);
      }

      if (product.etsySyncEnabled && product.etsyListingId) {
        result.channelStocks.etsy = await this.getEtsyStock(product.etsyListingId);
      }

      if (product.walmartSyncEnabled && product.walmartSku) {
        result.channelStocks.walmart = await this.getWalmartStock(product.walmartSku);
      }

      // Check for discrepancies
      for (const [channel, channelStock] of Object.entries(result.channelStocks)) {
        if (channelStock !== product.stock) {
          const difference = channelStock - product.stock;
          result.discrepancies.push(
            `${channel}: Expected ${product.stock}, Found ${channelStock} (Difference: ${difference})`
          );
        }
      }

      // Auto-resolve if configured
      if (result.discrepancies.length > 0) {
        await this.resolveDiscrepancies(product, result.channelStocks);
        result.resolved = true;
      }

      return result;
    } catch (error) {
      logger.error(`Failed to reconcile product ${product.sku}`, { error });
      result.discrepancies.push(`Error: ${error.message}`);
      return result;
    }
  }

  /**
   * Get stock from Amazon
   */
  private async getAmazonStock(sku: string): Promise<number> {
    try {
      const config = await prisma.integrationConfig.findFirst({
        where: { platform: 'AMAZON', enabled: true },
      });

      if (!config) return 0;

      const sync = new AmazonSync(config.credentials);
      // Implementation depends on Amazon API
      return 0; // Placeholder
    } catch (error) {
      logger.error(`Failed to get Amazon stock for ${sku}`, { error });
      return 0;
    }
  }

  /**
   * Get stock from eBay
   */
  private async getEbayStock(itemId: string): Promise<number> {
    try {
      const config = await prisma.integrationConfig.findFirst({
        where: { platform: 'EBAY', enabled: true },
      });

      if (!config) return 0;

      const sync = new EbaySync(config.credentials);
      // Implementation depends on eBay API
      return 0; // Placeholder
    } catch (error) {
      logger.error(`Failed to get eBay stock for ${itemId}`, { error });
      return 0;
    }
  }

  /**
   * Get stock from Etsy
   */
  private async getEtsyStock(listingId: number): Promise<number> {
    try {
      const config = await prisma.integrationConfig.findFirst({
        where: { platform: 'ETSY', enabled: true },
      });

      if (!config) return 0;

      const sync = new EtsySync(config.credentials);
      // Implementation depends on Etsy API
      return 0; // Placeholder
    } catch (error) {
      logger.error(`Failed to get Etsy stock for ${listingId}`, { error });
      return 0;
    }
  }

  /**
   * Get stock from Walmart
   */
  private async getWalmartStock(sku: string): Promise<number> {
    try {
      const config = await prisma.integrationConfig.findFirst({
        where: { platform: 'WALMART', enabled: true },
      });

      if (!config) return 0;

      const sync = new WalmartSync(config.credentials);
      // Implementation depends on Walmart API
      return 0; // Placeholder
    } catch (error) {
      logger.error(`Failed to get Walmart stock for ${sku}`, { error });
      return 0;
    }
  }

  /**
   * Resolve inventory discrepancies
   */
  private async resolveDiscrepancies(
    product: any,
    channelStocks: Record<string, number>
  ): Promise<void> {
    logger.info(`Resolving discrepancies for product ${product.sku}`);

    try {
      // Strategy: Use local stock as source of truth
      const correctStock = product.stock;

      // Update all channels to match local stock
      const updatePromises: Promise<void>[] = [];

      if (channelStocks.amazon !== undefined && channelStocks.amazon !== correctStock) {
        updatePromises.push(this.updateAmazonStock(product.sku, correctStock));
      }

      if (channelStocks.ebay !== undefined && channelStocks.ebay !== correctStock) {
        updatePromises.push(this.updateEbayStock(product.ebayItemId, correctStock));
      }

      if (channelStocks.etsy !== undefined && channelStocks.etsy !== correctStock) {
        updatePromises.push(this.updateEtsyStock(product.etsyListingId, correctStock));
      }

      if (channelStocks.walmart !== undefined && channelStocks.walmart !== correctStock) {
        updatePromises.push(this.updateWalmartStock(product.walmartSku, correctStock));
      }

      await Promise.allSettled(updatePromises);

      // Log reconciliation
      await prisma.stockReconciliation.create({
        data: {
          productId: product.id,
          sku: product.sku,
          localStock: correctStock,
          channelStocks: JSON.stringify(channelStocks),
          discrepanciesFound: Object.keys(channelStocks).length,
          resolved: true,
          resolvedAt: new Date(),
        },
      });

      logger.info(`Resolved discrepancies for product ${product.sku}`);
    } catch (error) {
      logger.error(`Failed to resolve discrepancies for ${product.sku}`, { error });
    }
  }

  /**
   * Update Amazon stock
   */
  private async updateAmazonStock(sku: string, quantity: number): Promise<void> {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'AMAZON', enabled: true },
    });

    if (!config) return;

    const sync = new AmazonSync(config.credentials);
    await sync.syncInventory();
  }

  /**
   * Update eBay stock
   */
  private async updateEbayStock(itemId: string, quantity: number): Promise<void> {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'EBAY', enabled: true },
    });

    if (!config) return;

    const sync = new EbaySync(config.credentials);
    await sync.syncInventory();
  }

  /**
   * Update Etsy stock
   */
  private async updateEtsyStock(listingId: number, quantity: number): Promise<void> {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'ETSY', enabled: true },
    });

    if (!config) return;

    const sync = new EtsySync(config.credentials);
    await sync.syncInventory();
  }

  /**
   * Update Walmart stock
   */
  private async updateWalmartStock(sku: string, quantity: number): Promise<void> {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'WALMART', enabled: true },
    });

    if (!config) return;

    const sync = new WalmartSync(config.credentials);
    await sync.updateInventory();
  }

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(days: number = 7): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 86400000);

    return await prisma.stockReconciliation.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get products with persistent discrepancies
   */
  async getPersistentDiscrepancies(): Promise<any[]> {
    const recentReconciliations = await prisma.stockReconciliation.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 86400000 * 7) }, // Last 7 days
        discrepanciesFound: { gt: 0 },
      },
      select: {
        productId: true,
        sku: true,
      },
    });

    // Group by SKU and count occurrences
    const skuCounts: Record<string, number> = {};
    recentReconciliations.forEach(rec => {
      skuCounts[rec.sku] = (skuCounts[rec.sku] || 0) + 1;
    });

    // Filter SKUs with 3+ discrepancies
    const persistentSkus = Object.entries(skuCounts)
      .filter(([_, count]) => count >= 3)
      .map(([sku]) => sku);

    return await prisma.product.findMany({
      where: {
        sku: { in: persistentSkus },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
      },
    });
  }
}

/**
 * Background job for stock reconciliation
 */
export async function runStockReconciliation() {
  try {
    const reconciliation = new StockReconciliation();
    const results = await reconciliation.reconcileAll();

    const discrepanciesFound = results.filter(r => r.discrepancies.length > 0).length;

    logger.info(`Stock reconciliation completed. Found ${discrepanciesFound} products with discrepancies`);

    // Alert if too many discrepancies
    if (discrepanciesFound > 10) {
      logger.warn(`High number of inventory discrepancies detected: ${discrepanciesFound}`);
      // Send alert to admins
    }
  } catch (error) {
    logger.error('Stock reconciliation job failed', { error });
    throw error;
  }
}

export default StockReconciliation;
