/**
 * Order Export System
 * Purpose: Export orders to external systems (ERP, Accounting, Shipping)
 * Description: Multi-format order export with customizable templates
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';

interface ExportOptions {
  format: 'CSV' | 'XLSX' | 'PDF' | 'JSON' | 'XML';
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  channel?: string[];
  includeItems?: boolean;
  groupBy?: 'date' | 'channel' | 'status';
}

interface ExportedOrder {
  orderId: string;
  externalOrderId?: string;
  channel: string;
  status: string;
  customerEmail: string;
  customerName: string;
  total: number;
  currency: string;
  purchasedAt: Date;
  items?: any[];
}

export class OrderExport {
  /**
   * Export orders to specified format
   */
  async exportOrders(options: ExportOptions): Promise<Buffer | string> {
    logger.info('Exporting orders', { options });

    try {
      const orders = await this.fetchOrders(options);

      switch (options.format) {
        case 'CSV':
          return await this.exportToCSV(orders);
        case 'XLSX':
          return await this.exportToExcel(orders);
        case 'PDF':
          return await this.exportToPDF(orders);
        case 'JSON':
          return this.exportToJSON(orders);
        case 'XML':
          return this.exportToXML(orders);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Order export failed', { error });
      throw error;
    }
  }

  /**
   * Fetch orders based on filters
   */
  private async fetchOrders(options: ExportOptions): Promise<ExportedOrder[]> {
    const where: any = {};

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    if (options.status && options.status.length > 0) {
      where.status = { in: options.status };
    }

    if (options.channel && options.channel.length > 0) {
      where.channel = { in: options.channel };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: options.includeItems,
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(order => ({
      orderId: order.id.toString(),
      externalOrderId: order.externalOrderId || undefined,
      channel: order.channel,
      status: order.status,
      customerEmail: order.customerEmail,
      customerName: order.customer?.name || order.shippingAddress?.name || '',
      total: order.total / 100,
      currency: order.currency,
      purchasedAt: order.purchasedAt || order.createdAt,
      items: options.includeItems ? order.items : undefined,
    }));
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(orders: ExportedOrder[]): Promise<string> {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'orderId', title: 'Order ID' },
        { id: 'externalOrderId', title: 'External Order ID' },
        { id: 'channel', title: 'Channel' },
        { id: 'status', title: 'Status' },
        { id: 'customerEmail', title: 'Customer Email' },
        { id: 'customerName', title: 'Customer Name' },
        { id: 'total', title: 'Total' },
        { id: 'currency', title: 'Currency' },
        { id: 'purchasedAt', title: 'Purchase Date' },
      ],
    });

    const header = csvStringifier.getHeaderString();
    const records = csvStringifier.stringifyRecords(orders);

    return header + records;
  }

  /**
   * Export to Excel
   */
  private async exportToExcel(orders: ExportedOrder[]): Promise<Buffer> {
    const worksheet = XLSX.utils.json_to_sheet(orders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Add summary sheet
    const summary = this.generateSummary(orders);
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(orders: ExportedOrder[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Order Export Report', { align: 'center' });
      doc.moveDown();

      // Summary
      const summary = this.generateSummary(orders);
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10);
      summary.forEach(item => {
        doc.text(`${item.metric}: ${item.value}`);
      });
      doc.moveDown();

      // Orders table
      doc.fontSize(14).text('Orders', { underline: true });
      doc.fontSize(8);

      orders.slice(0, 50).forEach((order, index) => {
        if (index > 0 && index % 20 === 0) {
          doc.addPage();
        }

        doc.text(
          `${order.orderId} | ${order.channel} | ${order.status} | $${order.total} | ${order.customerEmail}`
        );
      });

      if (orders.length > 50) {
        doc.text(`... and ${orders.length - 50} more orders`);
      }

      doc.end();
    });
  }

  /**
   * Export to JSON
   */
  private exportToJSON(orders: ExportedOrder[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalOrders: orders.length,
        summary: this.generateSummary(orders),
        orders,
      },
      null,
      2
    );
  }

  /**
   * Export to XML
   */
  private exportToXML(orders: ExportedOrder[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>
';
    xml += '<OrderExport>
';
    xml += `  <ExportedAt>${new Date().toISOString()}</ExportedAt>
`;
    xml += `  <TotalOrders>${orders.length}</TotalOrders>
`;
    xml += '  <Orders>
';

    orders.forEach(order => {
      xml += '    <Order>
';
      xml += `      <OrderId>${this.escapeXml(order.orderId)}</OrderId>
`;
      if (order.externalOrderId) {
        xml += `      <ExternalOrderId>${this.escapeXml(order.externalOrderId)}</ExternalOrderId>
`;
      }
      xml += `      <Channel>${this.escapeXml(order.channel)}</Channel>
`;
      xml += `      <Status>${this.escapeXml(order.status)}</Status>
`;
      xml += `      <CustomerEmail>${this.escapeXml(order.customerEmail)}</CustomerEmail>
`;
      xml += `      <CustomerName>${this.escapeXml(order.customerName)}</CustomerName>
`;
      xml += `      <Total>${order.total}</Total>
`;
      xml += `      <Currency>${order.currency}</Currency>
`;
      xml += `      <PurchasedAt>${order.purchasedAt.toISOString()}</PurchasedAt>
`;

      if (order.items && order.items.length > 0) {
        xml += '      <Items>
';
        order.items.forEach(item => {
          xml += '        <Item>
';
          xml += `          <SKU>${this.escapeXml(item.sku)}</SKU>
`;
          xml += `          <Name>${this.escapeXml(item.name)}</Name>
`;
          xml += `          <Quantity>${item.quantity}</Quantity>
`;
          xml += `          <Price>${item.price / 100}</Price>
`;
          xml += '        </Item>
';
        });
        xml += '      </Items>
';
      }

      xml += '    </Order>
';
    });

    xml += '  </Orders>
';
    xml += '</OrderExport>';

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
   * Generate summary statistics
   */
  private generateSummary(orders: ExportedOrder[]): any[] {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const channelBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};

    orders.forEach(order => {
      channelBreakdown[order.channel] = (channelBreakdown[order.channel] || 0) + 1;
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
    });

    return [
      { metric: 'Total Orders', value: orders.length },
      { metric: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` },
      { metric: 'Average Order Value', value: `$${averageOrderValue.toFixed(2)}` },
      { metric: 'Channel Breakdown', value: JSON.stringify(channelBreakdown) },
      { metric: 'Status Breakdown', value: JSON.stringify(statusBreakdown) },
    ];
  }

  /**
   * Export for shipping integration
   */
  async exportForShipping(orderIds: number[]): Promise<any[]> {
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: true,
        shippingAddress: true,
      },
    });

    return orders.map(order => ({
      orderId: order.id,
      recipientName: order.shippingAddress?.name,
      address: {
        street1: order.shippingAddress?.street,
        street2: order.shippingAddress?.street2,
        city: order.shippingAddress?.city,
        state: order.shippingAddress?.state,
        postalCode: order.shippingAddress?.postalCode,
        country: order.shippingAddress?.country,
      },
      items: order.items.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
        description: item.name,
      })),
      weight: order.items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0),
      declaredValue: order.total / 100,
    }));
  }

  /**
   * Export for accounting system
   */
  async exportForAccounting(startDate: Date, endDate: Date): Promise<any[]> {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      include: {
        items: true,
      },
    });

    return orders.map(order => ({
      transactionId: order.id,
      date: order.createdAt,
      channel: order.channel,
      customerEmail: order.customerEmail,
      revenue: order.total / 100,
      tax: order.tax / 100,
      shipping: order.shipping / 100,
      subtotal: order.subtotal / 100,
      items: order.items.map(item => ({
        sku: item.sku,
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price / 100,
        total: (item.price * item.quantity) / 100,
      })),
    }));
  }
}

/**
 * Scheduled export job
 */
export async function runScheduledExport() {
  try {
    const exporter = new OrderExport();

    // Daily export
    const yesterday = new Date(Date.now() - 86400000);
    const today = new Date();

    const csvData = await exporter.exportOrders({
      format: 'CSV',
      startDate: yesterday,
      endDate: today,
      includeItems: false,
    });

    // Save to file system or cloud storage
    logger.info('Daily order export completed');
  } catch (error) {
    logger.error('Scheduled export failed', { error });
    throw error;
  }
}

export default OrderExport;
