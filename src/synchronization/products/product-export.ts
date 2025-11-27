/**
 * Product Export System
 * Purpose: Export products to marketplace channels
 * Description: Multi-channel product feed generation
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AmazonSync } from '../channels/amazon-sync';
import { EbaySync } from '../channels/ebay-sync';
import { EtsySync } from '../channels/etsy-sync';
import { WalmartSync } from '../channels/walmart-sync';

interface ProductExportOptions {
  channels?: string[];
  categoryId?: number;
  minStock?: number;
  priceMin?: number;
  priceMax?: number;
  onlyActive?: boolean;
}

export class ProductExport {
  /**
   * Export products to all enabled channels
   */
  async exportAllProducts(options: ProductExportOptions = {}): Promise<void> {
    logger.info('Starting product export to all channels');

    try {
      const products = await this.fetchProducts(options);

      logger.info(`Exporting ${products.length} products`);

      const channels = options.channels || ['AMAZON', 'EBAY', 'ETSY', 'WALMART'];
      const exportPromises = [];

      if (channels.includes('AMAZON')) {
        exportPromises.push(this.exportToAmazon(products));
      }
      if (channels.includes('EBAY')) {
        exportPromises.push(this.exportToEbay(products));
      }
      if (channels.includes('ETSY')) {
        exportPromises.push(this.exportToEtsy(products));
      }
      if (channels.includes('WALMART')) {
        exportPromises.push(this.exportToWalmart(products));
      }

      await Promise.allSettled(exportPromises);

      logger.info('Product export completed');
    } catch (error) {
      logger.error('Product export failed', { error });
      throw error;
    }
  }

  /**
   * Fetch products for export
   */
  private async fetchProducts(options: ProductExportOptions): Promise<any[]> {
    const where: any = {
      isActive: options.onlyActive !== false,
    };

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.minStock !== undefined) {
      where.stock = { gte: options.minStock };
    }

    if (options.priceMin !== undefined || options.priceMax !== undefined) {
      where.price = {};
      if (options.priceMin !== undefined) where.price.gte = options.priceMin;
      if (options.priceMax !== undefined) where.price.lte = options.priceMax;
    }

    return await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
    });
  }

  /**
   * Export to Amazon
   */
  private async exportToAmazon(products: any[]): Promise<void> {
    logger.info('Exporting products to Amazon');

    try {
      const config = await this.getChannelConfig('AMAZON');
      if (!config) {
        logger.info('Amazon not configured, skipping');
        return;
      }

      const sync = new AmazonSync(config.credentials);

      for (const product of products) {
        if (!product.amazonSyncEnabled) continue;

        try {
          await sync.syncSingleProduct(product);
          await this.markExported('AMAZON', product.id);
        } catch (error) {
          logger.error(`Failed to export product ${product.sku} to Amazon`, { error });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info('Amazon export completed');
    } catch (error) {
      logger.error('Amazon export failed', { error });
      throw error;
    }
  }

  /**
   * Export to eBay
   */
  private async exportToEbay(products: any[]): Promise<void> {
    logger.info('Exporting products to eBay');

    try {
      const config = await this.getChannelConfig('EBAY');
      if (!config) {
        logger.info('eBay not configured, skipping');
        return;
      }

      const sync = new EbaySync(config.credentials);

      for (const product of products) {
        if (!product.ebaySyncEnabled) continue;

        try {
          if (product.ebayItemId) {
            await sync.updateListing(product);
          } else {
            await sync.createListing(product);
          }
          await this.markExported('EBAY', product.id);
        } catch (error) {
          logger.error(`Failed to export product ${product.sku} to eBay`, { error });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info('eBay export completed');
    } catch (error) {
      logger.error('eBay export failed', { error });
      throw error;
    }
  }

  /**
   * Export to Etsy
   */
  private async exportToEtsy(products: any[]): Promise<void> {
    logger.info('Exporting products to Etsy');

    try {
      const config = await this.getChannelConfig('ETSY');
      if (!config) {
        logger.info('Etsy not configured, skipping');
        return;
      }

      const sync = new EtsySync(config.credentials);

      for (const product of products) {
        if (!product.etsySyncEnabled) continue;

        try {
          if (product.etsyListingId) {
            await sync.updateListing(product);
          } else {
            await sync.createListing(product);
          }
          await this.markExported('ETSY', product.id);
        } catch (error) {
          logger.error(`Failed to export product ${product.sku} to Etsy`, { error });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info('Etsy export completed');
    } catch (error) {
      logger.error('Etsy export failed', { error });
      throw error;
    }
  }

  /**
   * Export to Walmart
   */
  private async exportToWalmart(products: any[]): Promise<void> {
    logger.info('Exporting products to Walmart');

    try {
      const config = await this.getChannelConfig('WALMART');
      if (!config) {
        logger.info('Walmart not configured, skipping');
        return;
      }

      const sync = new WalmartSync(config.credentials);

      for (const product of products) {
        if (!product.walmartSyncEnabled) continue;

        try {
          if (product.walmartSku) {
            await sync.updateItem(product);
          } else {
            await sync.createItem(product);
          }
          await this.markExported('WALMART', product.id);
        } catch (error) {
          logger.error(`Failed to export product ${product.sku} to Walmart`, { error });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info('Walmart export completed');
    } catch (error) {
      logger.error('Walmart export failed', { error });
      throw error;
    }
  }

  /**
   * Mark product as exported to channel
   */
  private async markExported(channel: string, productId: number): Promise<void> {
    const fieldMap: Record<string, string> = {
      AMAZON: 'amazonLastSync',
      EBAY: 'ebayLastSync',
      ETSY: 'etsyLastSync',
      WALMART: 'walmartLastSync',
    };

    const field = fieldMap[channel];
    if (!field) return;

    await prisma.product.update({
      where: { id: productId },
      data: { [field]: new Date() },
    });
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
   * Generate Google Shopping feed
   */
  async generateGoogleShoppingFeed(): Promise<string> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        brand: true,
      },
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>
';
    xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
';
    xml += '  <channel>
';
    xml += '    <title>BharatCart Products</title>
';
    xml += '    <link>https://bharatcart.com</link>
';
    xml += '    <description>BharatCart Product Feed</description>
';

    products.forEach(product => {
      xml += '    <item>
';
      xml += `      <g:id>${product.id}</g:id>
`;
      xml += `      <g:title><![CDATA[${product.name}]]></g:title>
`;
      xml += `      <g:description><![CDATA[${product.description}]]></g:description>
`;
      xml += `      <g:link>https://bharatcart.com/products/${product.slug}</g:link>
`;
      xml += `      <g:image_link>${product.images[0]?.url || ''}</g:image_link>
`;
      xml += `      <g:condition>new</g:condition>
`;
      xml += `      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
`;
      xml += `      <g:price>${(product.price / 100).toFixed(2)} USD</g:price>
`;
      xml += `      <g:brand>${product.brand?.name || 'Generic'}</g:brand>
`;
      xml += `      <g:google_product_category>${product.category?.name || 'Other'}</g:google_product_category>
`;
      xml += `      <g:gtin>${product.gtin || ''}</g:gtin>
`;
      xml += `      <g:mpn>${product.sku}</g:mpn>
`;
      xml += '    </item>
';
    });

    xml += '  </channel>
';
    xml += '</rss>';

    return xml;
  }

  /**
   * Generate Facebook catalog feed
   */
  async generateFacebookCatalog(): Promise<string> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { brand: true },
    });

    let csv = 'id,title,description,availability,condition,price,link,image_link,brand
';

    products.forEach(product => {
      csv += `"${product.id}",`;
      csv += `"${product.name.replace(/"/g, '""')}",`;
      csv += `"${product.description.replace(/"/g, '""')}",`;
      csv += `"${product.stock > 0 ? 'in stock' : 'out of stock'}",`;
      csv += `"new",`;
      csv += `"${(product.price / 100).toFixed(2)} USD",`;
      csv += `"https://bharatcart.com/products/${product.slug}",`;
      csv += `"${product.images[0]?.url || ''}",`;
      csv += `"${product.brand?.name || 'Generic'}"
`;
    });

    return csv;
  }
}

/**
 * Scheduled product export
 */
export async function runProductExport() {
  try {
    const exporter = new ProductExport();
    await exporter.exportAllProducts({ onlyActive: true });

    logger.info('Scheduled product export completed');
  } catch (error) {
    logger.error('Scheduled product export failed', { error });
    throw error;
  }
}

export default ProductExport;
