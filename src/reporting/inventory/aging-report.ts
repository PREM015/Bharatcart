/**
 * Inventory Aging Report
 * Purpose: Identify slow-moving and dead stock
 * Description: Age analysis of inventory items
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AgingReportData {
  ageGroups: Array<{
    ageRange: string;
    productCount: number;
    quantity: number;
    value: number;
    products: Array<{
      id: number;
      name: string;
      daysInStock: number;
      quantity: number;
      value: number;
    }>;
  }>;
  deadStock: Array<{
    id: number;
    name: string;
    daysInStock: number;
    quantity: number;
    value: number;
  }>;
}

export class AgingReport {
  async generate(): Promise<AgingReportData> {
    logger.info('Generating inventory aging report');

    const products = await prisma.product.findMany({
      where: { stock_quantity: { gt: 0 } },
      select: {
        id: true,
        name: true,
        stock_quantity: true,
        price: true,
        created_at: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    const now = new Date();
    const productsWithAge = products.map(p => {
      const daysInStock = Math.floor(
        (now.getTime() - p.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: p.id,
        name: p.name,
        daysInStock,
        quantity: p.stock_quantity,
        value: (p.stock_quantity * p.price) / 100,
        salesCount: p._count.orderItems,
      };
    });

    const ageGroups = [
      { range: '0-30 days', min: 0, max: 30 },
      { range: '31-60 days', min: 31, max: 60 },
      { range: '61-90 days', min: 61, max: 90 },
      { range: '91-180 days', min: 91, max: 180 },
      { range: '180+ days', min: 181, max: Infinity },
    ];

    const grouped = ageGroups.map(group => {
      const items = productsWithAge.filter(p =>
        p.daysInStock >= group.min && p.daysInStock <= group.max
      );

      return {
        ageRange: group.range,
        productCount: items.length,
        quantity: items.reduce((sum, p) => sum + p.quantity, 0),
        value: items.reduce((sum, p) => sum + p.value, 0),
        products: items,
      };
    });

    const deadStock = productsWithAge.filter(p =>
      p.daysInStock > 180 && p.salesCount === 0
    );

    return { ageGroups: grouped, deadStock };
  }
}

export default AgingReport;
