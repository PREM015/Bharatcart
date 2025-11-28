/**
 * Box Size Optimizer
 * Purpose: Select optimal box size for items
 */

import { logger } from '@/lib/logger';

export interface BoxSize {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
}

export class BoxSizeOptimizer {
  private availableBoxes: BoxSize[] = [
    { id: 'small', name: 'Small Box', length: 20, width: 15, height: 10, maxWeight: 2, cost: 2 },
    { id: 'medium', name: 'Medium Box', length: 30, width: 25, height: 20, maxWeight: 5, cost: 3 },
    { id: 'large', name: 'Large Box', length: 40, width: 35, height: 30, maxWeight: 10, cost: 5 },
  ];

  findOptimalBox(items: Array<{ weight: number; volume: number }>): BoxSize | null {
    logger.info('Finding optimal box', { itemCount: items.length });

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);

    for (const box of this.availableBoxes) {
      const boxVolume = box.length * box.width * box.height;
      if (totalWeight <= box.maxWeight && totalVolume <= boxVolume) {
        return box;
      }
    }

    return this.availableBoxes[this.availableBoxes.length - 1];
  }
}

export default BoxSizeOptimizer;
