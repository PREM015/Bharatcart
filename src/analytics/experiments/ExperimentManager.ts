/**
 * A/B Testing Experiment Manager
 * Purpose: Manage and run A/B tests
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface Experiment {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  traffic: number;
  startDate?: Date;
  endDate?: Date;
}

export interface Variant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

export class ExperimentManager {
  async createExperiment(experiment: Omit<Experiment, 'id'>): Promise<Experiment> {
    const created = await prisma.experiment.create({
      data: {
        name: experiment.name,
        status: experiment.status,
        variants: JSON.stringify(experiment.variants),
        traffic: experiment.traffic,
        start_date: experiment.startDate,
        end_date: experiment.endDate,
      },
    });

    logger.info('Experiment created', { id: created.id });
    return this.mapToExperiment(created);
  }

  async getActiveExperiments(): Promise<Experiment[]> {
    const experiments = await prisma.experiment.findMany({
      where: { status: 'running' },
    });

    return experiments.map(e => this.mapToExperiment(e));
  }

  async recordImpression(experimentId: string, userId: number, variantId: string): Promise<void> {
    await prisma.experimentImpression.create({
      data: {
        experiment_id: experimentId,
        user_id: userId,
        variant_id: variantId,
        created_at: new Date(),
      },
    });
  }

  async recordConversion(experimentId: string, userId: number, metric: string, value: number): Promise<void> {
    await prisma.experimentConversion.create({
      data: {
        experiment_id: experimentId,
        user_id: userId,
        metric,
        value,
        created_at: new Date(),
      },
    });
  }

  private mapToExperiment(record: any): Experiment {
    return {
      id: record.id,
      name: record.name,
      status: record.status,
      variants: JSON.parse(record.variants || '[]'),
      traffic: record.traffic,
      startDate: record.start_date,
      endDate: record.end_date,
    };
  }
}

export default ExperimentManager;
