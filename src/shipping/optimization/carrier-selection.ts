/**
 * Carrier Selection
 * Purpose: Automatically select best carrier based on criteria
 */

import { logger } from '@/lib/logger';

export interface CarrierOption {
  carrier: string;
  service: string;
  cost: number;
  transitDays: number;
  reliability: number;
}

export class CarrierSelector {
  selectBest(
    options: CarrierOption[],
    priority: 'cost' | 'speed' | 'reliability' = 'cost'
  ): CarrierOption {
    logger.info('Selecting best carrier', { optionCount: options.length, priority });

    switch (priority) {
      case 'cost':
        return options.reduce((best, current) =>
          current.cost < best.cost ? current : best
        );
      case 'speed':
        return options.reduce((best, current) =>
          current.transitDays < best.transitDays ? current : best
        );
      case 'reliability':
        return options.reduce((best, current) =>
          current.reliability > best.reliability ? current : best
        );
    }
  }

  selectBalanced(options: CarrierOption[]): CarrierOption {
    // Weighted scoring
    return options.reduce((best, current) => {
      const bestScore = this.calculateScore(best);
      const currentScore = this.calculateScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateScore(option: CarrierOption): number {
    const costScore = 1 / option.cost;
    const speedScore = 1 / option.transitDays;
    const reliabilityScore = option.reliability;

    return costScore * 0.4 + speedScore * 0.3 + reliabilityScore * 0.3;
  }
}

export default CarrierSelector;
