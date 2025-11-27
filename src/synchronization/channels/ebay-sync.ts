/**
 * eBay Marketplace Synchronization
 * Purpose: Sync products, orders, inventory with eBay API
 * Description: Complete eBay integration using Trading API
 */

import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface EbayCredentials {
  appId: string;
  certId: string;
  devId: string;
  authToken: string;
  environment: 'production' | 'sandbox';
}

interface EbayListing {
  itemId: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  categoryId: string;
  condition: string;
  shippingType: string;
  listingDuration: string;
}

export class EbaySync {
  private credentials: EbayCredentials;
  private baseUrl: string;

  constructor(credentials: EbayCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.environment === 'production'
      ? 'https://api.ebay.com/ws/api.dll'
      : 'https://api.sandbox.ebay.com/ws/api.dll';
  }

  /**
   * Make eBay API request
   */
  private async makeRequest(callName: string, requestData: any): Promise<any> {
    try {
      const xmlRequest = this.buildXmlRequest(callName, requestData);

      const response = await axios.post(this.baseUrl, xmlRequest, {
        headers: {
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-CALL-NAME': callName,
          'X-EBAY-API-SITEID': '0', // US site
          'Content-Type': 'text/xml',
        },
      });

      return this.parseXmlResponse(response.data);
    } catch (error) {
      logger.error('eBay API request failed', { callName, error });
      throw error;
    }
  }

  /**
   * Build XML request for eBay API
   */
  private buildXmlRequest(callName: string, data: any): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${this.credentials.authToken}</eBayAuthToken>
  </RequesterCredentials>
  ${this.objectToXml(data)}
</${callName}Request>`;
  }

  /**
   * Convert object to XML
   */
  private objectToXml(obj: any, indent = ''): string {
    let xml = '';
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          xml += `${indent}<${key}>${this.objectToXml(item, indent + '  ')}</${key}>
`;
        });
      } else if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>
${this.objectToXml(value, indent + '  ')}${indent}</${key}>
`;
      } else {
        xml += `${indent}<${key}>${this.escapeXml(String(value))}</${key}>
`;
      }
    }
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Parse XML response
   */
  private parseXmlResponse(xml: string): any {
    // Simple XML parsing - in production use a proper XML parser like 'fast-xml-parser'
    return JSON.parse(xml); // Placeholder
  }

  /**
   * Create eBay listing
   */
  async createListing(product: any): Promise<string> {
    logger.info(`Creating eBay listing for product ${product.sku}`);

    try {
      const listingData = {
        Item: {
          Title: product.name.substring(0, 80), // eBay title limit
          Description: this.formatDescription(product.description),
          PrimaryCategory: {
            CategoryID: product.ebayCategoryId || '1', // Default category
          },
          StartPrice: (product.price / 100).toFixed(2),
          ConditionID: product.condition === 'NEW' ? '1000' : '3000',
          Country: 'US',
          Currency: 'USD',
          DispatchTimeMax: '3',
          ListingDuration: 'GTC', // Good Till Cancelled
          ListingType: 'FixedPriceItem',
          PaymentMethods: 'PayPal',
          PayPalEmailAddress: 'payments@bharatcart.com',
          PictureDetails: {
            PictureURL: product.images.slice(0, 12), // eBay allows max 12 images
          },
          PostalCode: '10001',
          Quantity: product.stock,
          ReturnPolicy: {
            ReturnsAcceptedOption: 'ReturnsAccepted',
            RefundOption: 'MoneyBack',
            ReturnsWithinOption: 'Days_30',
            ShippingCostPaidByOption: 'Buyer',
          },
          ShippingDetails: {
            ShippingType: 'Flat',
            ShippingServiceOptions: {
              ShippingServicePriority: '1',
              ShippingService: 'USPSPriority',
              ShippingServiceCost: '5.00',
            },
          },
          Site: 'US',
          SKU: product.sku,
        },
      };

      const response = await this.makeRequest('AddFixedPriceItem', listingData);

      const itemId = response.ItemID;

      // Save eBay item ID to database
      await prisma.product.update({
        where: { id: product.id },
        data: { ebayItemId: itemId },
      });

      logger.info(`Created eBay listing ${itemId} for product ${product.sku}`);
      return itemId;
    } catch (error) {
      logger.error(`Failed to create eBay listing for ${product.sku}`, { error });
      throw error;
    }
  }

  /**
   * Format product description for eBay
   */
  private formatDescription(description: string): string {
    return `
      <![CDATA[
        <div style="font-family: Arial, sans-serif;">
          <h2>Product Description</h2>
          <p>${description}</p>
          <hr>
          <p><strong>Fast Shipping</strong> - Ships within 1-3 business days</p>
          <p><strong>Easy Returns</strong> - 30-day return policy</p>
          <p><strong>Secure Payment</strong> - PayPal accepted</p>
        </div>
      ]]>
    `;
  }

  /**
   * Update eBay listing
   */
  async updateListing(product: any): Promise<void> {
    if (!product.ebayItemId) {
      logger.warn(`Product ${product.sku} has no eBay item ID`);
      return;
    }

    logger.info(`Updating eBay listing ${product.ebayItemId}`);

    try {
      const updateData = {
        Item: {
          ItemID: product.ebayItemId,
          Title: product.name.substring(0, 80),
          Description: this.formatDescription(product.description),
          StartPrice: (product.price / 100).toFixed(2),
          Quantity: product.stock,
        },
      };

      await this.makeRequest('ReviseFixedPriceItem', updateData);

      await prisma.product.update({
        where: { id: product.id },
        data: { ebayLastSync: new Date() },
      });

      logger.info(`Updated eBay listing ${product.ebayItemId}`);
    } catch (error) {
      logger.error(`Failed to update eBay listing ${product.ebayItemId}`, { error });
      throw error;
    }
  }

  /**
   * End eBay listing
   */
  async endListing(itemId: string, reason: string = 'NotAvailable'): Promise<void> {
    logger.info(`Ending eBay listing ${itemId}`);

    try {
      await this.makeRequest('EndFixedPriceItem', {
        ItemID: itemId,
        EndingReason: reason,
      });

      logger.info(`Ended eBay listing ${itemId}`);
    } catch (error) {
      logger.error(`Failed to end eBay listing ${itemId}`, { error });
      throw error;
    }
  }

  /**
   * Import eBay orders
   */
  async importOrders(): Promise<void> {
    logger.info('Starting eBay order import');

    try {
      const createTimeFrom = new Date(Date.now() - 86400000).toISOString(); // Last 24 hours
      const createTimeTo = new Date().toISOString();

      const response = await this.makeRequest('GetOrders', {
        CreateTimeFrom: createTimeFrom,
        CreateTimeTo: createTimeTo,
        OrderRole: 'Seller',
        OrderStatus: 'All',
        Pagination: {
          EntriesPerPage: 100,
          PageNumber: 1,
        },
      });

      const orders = response.OrderArray?.Order || [];
      logger.info(`Found ${orders.length} eBay orders to import`);

      for (const ebayOrder of orders) {
        await this.importSingleOrder(ebayOrder);
      }

      logger.info('eBay order import completed');
    } catch (error) {
      logger.error('eBay order import failed', { error });
      throw error;
    }
  }

  /**
   * Import single eBay order
   */
  private async importSingleOrder(ebayOrder: any): Promise<void> {
    try {
      const existing = await prisma.order.findFirst({
        where: { ebayOrderId: ebayOrder.OrderID },
      });

      if (existing) {
        logger.info(`Order ${ebayOrder.OrderID} already imported`);
        return;
      }

      const transactions = Array.isArray(ebayOrder.TransactionArray.Transaction)
        ? ebayOrder.TransactionArray.Transaction
        : [ebayOrder.TransactionArray.Transaction];

      await prisma.order.create({
        data: {
          ebayOrderId: ebayOrder.OrderID,
          channel: 'EBAY',
          status: this.mapEbayStatus(ebayOrder.OrderStatus),
          total: parseFloat(ebayOrder.Total.value) * 100,
          currency: ebayOrder.Total.currencyID,
          customerEmail: ebayOrder.BuyerUserID,
          shippingAddress: {
            create: {
              name: ebayOrder.ShippingAddress.Name,
              street: ebayOrder.ShippingAddress.Street1,
              city: ebayOrder.ShippingAddress.CityName,
              state: ebayOrder.ShippingAddress.StateOrProvince,
              postalCode: ebayOrder.ShippingAddress.PostalCode,
              country: ebayOrder.ShippingAddress.CountryName,
            },
          },
          items: {
            create: transactions.map((transaction: any) => ({
              productId: this.findProductBySku(transaction.Item.SKU),
              sku: transaction.Item.SKU,
              quantity: transaction.QuantityPurchased,
              price: parseFloat(transaction.TransactionPrice.value) * 100,
            })),
          },
        },
      });

      logger.info(`Imported eBay order ${ebayOrder.OrderID}`);
    } catch (error) {
      logger.error(`Failed to import eBay order ${ebayOrder.OrderID}`, { error });
    }
  }

  /**
   * Sync inventory to eBay
   */
  async syncInventory(): Promise<void> {
    logger.info('Starting eBay inventory sync');

    try {
      const products = await prisma.product.findMany({
        where: {
          ebaySyncEnabled: true,
          ebayItemId: { not: null },
        },
        select: { id: true, ebayItemId: true, stock: true },
      });

      for (const product of products) {
        await this.makeRequest('ReviseInventoryStatus', {
          InventoryStatus: {
            ItemID: product.ebayItemId,
            Quantity: product.stock,
          },
        });

        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      }

      logger.info('eBay inventory sync completed');
    } catch (error) {
      logger.error('eBay inventory sync failed', { error });
      throw error;
    }
  }

  /**
   * Map eBay order status to internal status
   */
  private mapEbayStatus(ebayStatus: string): string {
    const statusMap: Record<string, string> = {
      Active: 'PENDING',
      Inactive: 'CANCELLED',
      Completed: 'DELIVERED',
      Shipped: 'SHIPPED',
    };
    return statusMap[ebayStatus] || 'PENDING';
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
}

/**
 * Background job to sync eBay data
 */
export async function runEbaySync() {
  try {
    const config = await prisma.integrationConfig.findFirst({
      where: { platform: 'EBAY', enabled: true },
    });

    if (!config) {
      logger.info('eBay sync not configured');
      return;
    }

    const credentials = config.credentials as EbayCredentials;
    const sync = new EbaySync(credentials);

    await sync.syncInventory();
    await sync.importOrders();

    logger.info('eBay sync completed successfully');
  } catch (error) {
    logger.error('eBay sync failed', { error });
    throw error;
  }
}

export default EbaySync;
