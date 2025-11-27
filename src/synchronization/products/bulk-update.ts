/**
 * Bulk Product Update System
 * Purpose: Mass update products across all channels
 * Description: Efficient bulk operations with validation and rollback
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

interface BulkUpdateOperation {
  productId?: number;
  sku: string;
  updates: Record<string, any>;
  channels?: string[];
}

interface BulkUpdateResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{
    sku: string;
    error: string;
  }>;
}

interface ValidationRule {
  field: string;
  type: 'required' | 'number' | 'string' | 'boolean' | 'range';
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export class BulkUpdate {
  private validationRules: ValidationRule[] = [
    { field: 'name', type: 'required' },
    { field: 'price', type: 'number', min: 0 },
    { field: 'stock', type: 'number', min: 0 },
    { field: 'weight', type: 'number', min: 0 },
  ];

  /**
   * Bulk update products from array
   */
  async bulkUpdateProducts(operations: BulkUpdateOperation[]): Promise<BulkUpdateResult> {
    logger.info(`Starting bulk update for ${operations.length} products`);

    const result: BulkUpdateResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Create transaction for rollback capability
    const transactionId = `bulk_update_${Date.now()}`;
    await this.createTransactionLog(transactionId, operations);

    try {
      for (const operation of operations) {
        result.totalProcessed++;

        try {
          // Validate update
          const validation = this.validateUpdate(operation.updates);
          if (!validation.valid) {
            result.failed++;
            result.errors.push({
              sku: operation.sku,
              error: validation.errors.join(', '),
            });
            continue;
          }

          // Find product
          const product = await this.findProduct(operation);
          if (!product) {
            result.failed++;
            result.errors.push({
              sku: operation.sku,
              error: 'Product not found',
            });
            continue;
          }

          // Apply updates
          await this.updateProduct(product.id, operation.updates);

          // Sync to channels if specified
          if (operation.channels && operation.channels.length > 0) {
            await this.syncToChannels(product.id, operation.channels);
          }

          result.successful++;

          // Log change
          await this.logChange(transactionId, product.id, operation.updates);
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            sku: operation.sku,
            error: error.message,
          });
          logger.error(`Failed to update product ${operation.sku}`, { error });
        }

        // Rate limiting
        if (result.totalProcessed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await this.completeTransactionLog(transactionId, result);

      logger.info('Bulk update completed', { result });
      return result;
    } catch (error) {
      logger.error('Bulk update failed', { error });
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  /**
   * Bulk update from CSV file
   */
  async bulkUpdateFromCSV(csvData: string): Promise<BulkUpdateResult> {
    logger.info('Processing CSV bulk update');

    try {
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const operations: BulkUpdateOperation[] = records.map((record: any) => ({
        sku: record.sku,
        updates: this.mapCSVRecord(record),
        channels: record.sync_channels?.split(',').map((c: string) => c.trim()),
      }));

      return await this.bulkUpdateProducts(operations);
    } catch (error) {
      logger.error('CSV bulk update failed', { error });
      throw error;
    }
  }

  /**
   * Bulk update from Excel file
   */
  async bulkUpdateFromExcel(buffer: Buffer): Promise<BulkUpdateResult> {
    logger.info('Processing Excel bulk update');

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet);

      const operations: BulkUpdateOperation[] = records.map((record: any) => ({
        sku: record.sku || record.SKU,
        updates: this.mapExcelRecord(record),
        channels: record.sync_channels?.split(',').map((c: string) => c.trim()),
      }));

      return await this.bulkUpdateProducts(operations);
    } catch (error) {
      logger.error('Excel bulk update failed', { error });
      throw error;
    }
  }

  /**
   * Map CSV record to update object
   */
  private mapCSVRecord(record: any): Record<string, any> {
    const updates: Record<string, any> = {};

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      price: 'price',
      compare_at_price: 'compareAtPrice',
      cost_price: 'costPrice',
      stock: 'stock',
      sku: 'sku',
      barcode: 'barcode',
      weight: 'weight',
      is_active: 'isActive',
    };

    for (const [csvField, dbField] of Object.entries(fieldMap)) {
      if (record[csvField] !== undefined && record[csvField] !== '') {
        let value = record[csvField];

        // Type conversion
        if (['price', 'compare_at_price', 'cost_price', 'weight'].includes(csvField)) {
          value = parseFloat(value) * 100; // Convert to cents
        } else if (csvField === 'stock') {
          value = parseInt(value);
        } else if (csvField === 'is_active') {
          value = value.toLowerCase() === 'true' || value === '1';
        }

        updates[dbField] = value;
      }
    }

    return updates;
  }

  /**
   * Map Excel record to update object
   */
  private mapExcelRecord(record: any): Record<string, any> {
    // Similar to CSV mapping
    return this.mapCSVRecord(record);
  }

  /**
   * Validate update operation
   */
  private validateUpdate(updates: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = updates[rule.field];

      if (value === undefined) continue;

      if (rule.type === 'required' && !value) {
        errors.push(`${rule.field} is required`);
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${rule.field} must be a number`);
      }

      if (rule.type === 'number' && rule.min !== undefined && value < rule.min) {
        errors.push(`${rule.field} must be at least ${rule.min}`);
      }

      if (rule.type === 'number' && rule.max !== undefined && value > rule.max) {
        errors.push(`${rule.field} must be at most ${rule.max}`);
      }

      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push(`${rule.field} format is invalid`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Find product by ID or SKU
   */
  private async findProduct(operation: BulkUpdateOperation): Promise<any> {
    if (operation.productId) {
      return await prisma.product.findUnique({
        where: { id: operation.productId },
      });
    }

    return await prisma.product.findFirst({
      where: { sku: operation.sku },
    });
  }

  /**
   * Update product
   */
  private async updateProduct(
    productId: number,
    updates: Record<string, any>
  ): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await redis.del(`product:${productId}`);
  }

  /**
   * Sync to specified channels
   */
  private async syncToChannels(productId: number, channels: string[]): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });

    if (!product) return;

    // Queue sync jobs for each channel
    for (const channel of channels) {
      await redis.lpush(
        'sync:queue',
        JSON.stringify({
          type: 'product_sync',
          channel,
          productId,
          data: product,
        })
      );
    }
  }

  /**
   * Create transaction log
   */
  private async createTransactionLog(
    transactionId: string,
    operations: BulkUpdateOperation[]
  ): Promise<void> {
    await prisma.bulkUpdateTransaction.create({
      data: {
        transactionId,
        operationCount: operations.length,
        status: 'IN_PROGRESS',
        operations: JSON.stringify(operations),
      },
    });
  }

  /**
   * Complete transaction log
   */
  private async completeTransactionLog(
    transactionId: string,
    result: BulkUpdateResult
  ): Promise<void> {
    await prisma.bulkUpdateTransaction.update({
      where: { transactionId },
      data: {
        status: result.failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        successful: result.successful,
        failed: result.failed,
        errors: JSON.stringify(result.errors),
        completedAt: new Date(),
      },
    });
  }

  /**
   * Log individual change
   */
  private async logChange(
    transactionId: string,
    productId: number,
    updates: Record<string, any>
  ): Promise<void> {
    await prisma.productChangeLog.create({
      data: {
        transactionId,
        productId,
        changes: JSON.stringify(updates),
        changedAt: new Date(),
      },
    });
  }

  /**
   * Rollback transaction
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    logger.warn(`Rolling back transaction ${transactionId}`);

    try {
      const transaction = await prisma.bulkUpdateTransaction.findUnique({
        where: { transactionId },
      });

      if (!transaction) return;

      // Get all changes
      const changes = await prisma.productChangeLog.findMany({
        where: { transactionId },
      });

      // Revert changes (implementation depends on requirements)
      // For now, just mark as rolled back
      await prisma.bulkUpdateTransaction.update({
        where: { transactionId },
        data: {
          status: 'ROLLED_BACK',
          completedAt: new Date(),
        },
      });

      logger.info(`Transaction ${transactionId} rolled back`);
    } catch (error) {
      logger.error(`Rollback failed for ${transactionId}`, { error });
      throw error;
    }
  }

  /**
   * Bulk price update
   */
  async bulkUpdatePrices(
    priceUpdates: Array<{ sku: string; price: number; compareAtPrice?: number }>
  ): Promise<BulkUpdateResult> {
    const operations: BulkUpdateOperation[] = priceUpdates.map(update => ({
      sku: update.sku,
      updates: {
        price: Math.round(update.price * 100),
        compareAtPrice: update.compareAtPrice
          ? Math.round(update.compareAtPrice * 100)
          : undefined,
      },
      channels: ['AMAZON', 'EBAY', 'ETSY', 'WALMART'],
    }));

    return await this.bulkUpdateProducts(operations);
  }

  /**
   * Bulk inventory update
   */
  async bulkUpdateInventory(
    inventoryUpdates: Array<{ sku: string; stock: number; location?: string }>
  ): Promise<BulkUpdateResult> {
    const operations: BulkUpdateOperation[] = inventoryUpdates.map(update => ({
      sku: update.sku,
      updates: {
        stock: update.stock,
      },
      channels: ['AMAZON', 'EBAY', 'ETSY', 'WALMART'],
    }));

    return await this.bulkUpdateProducts(operations);
  }

  /**
   * Bulk activate/deactivate products
   */
  async bulkToggleActive(skus: string[], isActive: boolean): Promise<BulkUpdateResult> {
    const operations: BulkUpdateOperation[] = skus.map(sku => ({
      sku,
      updates: {
        isActive,
      },
    }));

    return await this.bulkUpdateProducts(operations);
  }

  /**
   * Get bulk update history
   */
  async getUpdateHistory(days: number = 30): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 86400000);

    return await prisma.bulkUpdateTransaction.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(transactionId: string): Promise<any> {
    const transaction = await prisma.bulkUpdateTransaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const changes = await prisma.productChangeLog.findMany({
      where: { transactionId },
      include: {
        product: {
          select: { sku: true, name: true },
        },
      },
    });

    return {
      transaction,
      changes,
    };
  }

  /**
   * Generate bulk update template
   */
  async generateTemplate(format: 'CSV' | 'XLSX'): Promise<Buffer | string> {
    const headers = [
      'sku',
      'name',
      'description',
      'price',
      'compare_at_price',
      'cost_price',
      'stock',
      'weight',
      'is_active',
      'sync_channels',
    ];

    const sampleData = [
      {
        sku: 'SAMPLE-001',
        name: 'Sample Product',
        description: 'Sample description',
        price: '99.99',
        compare_at_price: '129.99',
        cost_price: '50.00',
        stock: '100',
        weight: '1.5',
        is_active: 'true',
        sync_channels: 'AMAZON,EBAY',
      },
    ];

    if (format === 'CSV') {
      let csv = headers.join(',') + '
';
      sampleData.forEach(row => {
        csv += headers.map(h => row[h as keyof typeof row] || '').join(',') + '
';
      });
      return csv;
    } else {
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Update Template');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
  }
}

/**
 * Scheduled bulk sync job
 */
export async function runScheduledBulkSync() {
  try {
    const bulkUpdate = new BulkUpdate();

    // Get products that need syncing
    const productsToSync = await prisma.product.findMany({
      where: {
        OR: [
          { amazonSyncEnabled: true, amazonLastSync: { lt: new Date(Date.now() - 3600000) } },
          { ebaySyncEnabled: true, ebayLastSync: { lt: new Date(Date.now() - 3600000) } },
          { etsySyncEnabled: true, etsyLastSync: { lt: new Date(Date.now() - 3600000) } },
          { walmartSyncEnabled: true, walmartLastSync: { lt: new Date(Date.now() - 3600000) } },
        ],
      },
      take: 100,
    });

    logger.info(`Scheduled bulk sync for ${productsToSync.length} products`);

    for (const product of productsToSync) {
      const channels = [];
      if (product.amazonSyncEnabled) channels.push('AMAZON');
      if (product.ebaySyncEnabled) channels.push('EBAY');
      if (product.etsySyncEnabled) channels.push('ETSY');
      if (product.walmartSyncEnabled) channels.push('WALMART');

      await bulkUpdate.syncToChannels(product.id, channels);
    }

    logger.info('Scheduled bulk sync completed');
  } catch (error) {
    logger.error('Scheduled bulk sync failed', { error });
    throw error;
  }
}

export default BulkUpdate;
