/**
 * Packing Slip Generator
 * Purpose: Generate packing slips for shipments
 */

import { logger } from '@/lib/logger';

export interface PackingSlipData {
  orderId: string;
  orderDate: Date;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
  }>;
  destination: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
  };
}

export class PackingSlipGenerator {
  generate(data: PackingSlipData): string {
    logger.info('Generating packing slip', { orderId: data.orderId });

    return `
      <html>
        <head><title>Packing Slip - ${data.orderId}</title></head>
        <body>
          <h1>Packing Slip</h1>
          <p><strong>Order #:</strong> ${data.orderId}</p>
          <p><strong>Date:</strong> ${data.orderDate.toLocaleDateString()}</p>
          <h2>Ship To:</h2>
          <p>
            ${data.destination.name}<br/>
            ${data.destination.address}<br/>
            ${data.destination.city}, ${data.destination.postalCode}
          </p>
          <h2>Items:</h2>
          <table>
            <tr><th>SKU</th><th>Description</th><th>Qty</th></tr>
            ${data.items.map(item => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;
  }
}

export default PackingSlipGenerator;
