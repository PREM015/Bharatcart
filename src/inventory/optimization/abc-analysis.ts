/**
 * ABC Analysis
 * Purpose: Classify inventory by value/importance
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class ABCAnalysis {
  async analyze(): Promise<Map<string, number[]>> {
    logger.info('Running ABC analysis');

    const products = await prisma.product.findMany({
      include: {
        orderItems: {
          where: {
            order: { status: { notIn: ['cancelled', 'refunded'] } },
          },
        },
      },
    });

    const productValues = products.map(p => ({
      id: p.id,
      value: p.orderItems.reduce((sum, oi) => sum + (oi.price * oi.quantity), 0),
    }));

    productValues.sort((a, b) => b.value - a.value);

    const totalValue = productValues.reduce((sum, p) => sum + p.value, 0);
    
    const aThreshold = totalValue * 0.8;
    const bThreshold = totalValue * 0.95;

    const classification = new Map<string, number[]>([
      ['A', []],
      ['B', []],
      ['C', []],
    ]);

    let cumulative = 0;
    for (const pv of productValues) {
      cumulative += pv.value;
      if (cumulative <= aThreshold) {
        classification.get('A')!.push(pv.id);
      } else if (cumulative <= bThreshold) {
        classification.get('B')!.push(pv.id);
      } else {
        classification.get('C')!.push(pv.id);
      }
    }

    return classification;
  }
}

export default ABCAnalysis;
