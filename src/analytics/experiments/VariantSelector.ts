/**
 * Variant Selector
 * Purpose: Select A/B test variant for user
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { Experiment, Variant } from './ExperimentManager';

export class VariantSelector {
  selectVariant(experiment: Experiment, userId: number): Variant {
    const hash = this.hashUserId(experiment.id, userId);
    const bucket = hash % 100;

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        logger.debug('Variant selected', {
          experiment: experiment.id,
          variant: variant.id,
          userId,
        });
        return variant;
      }
    }

    return experiment.variants[0];
  }

  private hashUserId(experimentId: string, userId: number): number {
    const hash = crypto
      .createHash('md5')
      .update(`${experimentId}-${userId}`)
      .digest('hex');

    return parseInt(hash.substring(0, 8), 16);
  }
}

export default VariantSelector;
