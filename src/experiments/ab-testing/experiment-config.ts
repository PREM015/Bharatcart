/**
 * A/B Testing Experiment Configuration
 * Purpose: Define and manage A/B test experiments
 * Description: Experiment setup, variant configuration, traffic allocation
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  traffic_allocation: number; // Percentage 0-100
  config: Record<string, any>;
  is_control: boolean;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  type: 'ab' | 'multivariate' | 'feature_flag';
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: ExperimentVariant[];
  targeting_rules?: TargetingRule[];
  metrics: ExperimentMetric[];
  start_date?: Date;
  end_date?: Date;
  sample_size?: number;
  confidence_level: number; // e.g., 95 for 95%
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface TargetingRule {
  type: 'user_attribute' | 'segment' | 'location' | 'device' | 'custom';
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface ExperimentMetric {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'guardrail';
  metric_type: 'conversion' | 'revenue' | 'engagement' | 'retention' | 'custom';
  event_name?: string;
  aggregation: 'count' | 'sum' | 'average' | 'unique';
  goal?: number;
}

export class ExperimentConfigManager {
  /**
   * Create new experiment
   */
  async createExperiment(config: Omit<ExperimentConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ExperimentConfig> {
    logger.info('Creating new experiment', { name: config.name });

    // Validate traffic allocation
    this.validateTrafficAllocation(config.variants);

    // Ensure at least one control variant
    const hasControl = config.variants.some(v => v.is_control);
    if (!hasControl) {
      throw new Error('Experiment must have at least one control variant');
    }

    // Ensure at least one primary metric
    const hasPrimaryMetric = config.metrics.some(m => m.type === 'primary');
    if (!hasPrimaryMetric) {
      throw new Error('Experiment must have at least one primary metric');
    }

    const experiment = await prisma.experiment.create({
      data: {
        name: config.name,
        description: config.description,
        hypothesis: config.hypothesis,
        type: config.type,
        status: config.status,
        variants: JSON.stringify(config.variants),
        targeting_rules: config.targeting_rules ? JSON.stringify(config.targeting_rules) : null,
        metrics: JSON.stringify(config.metrics),
        start_date: config.start_date,
        end_date: config.end_date,
        sample_size: config.sample_size,
        confidence_level: config.confidence_level,
        created_by: config.created_by,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Update experiment
   */
  async updateExperiment(
    experimentId: string,
    updates: Partial<ExperimentConfig>
  ): Promise<ExperimentConfig> {
    logger.info('Updating experiment', { experiment_id: experimentId });

    const existing = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!existing) {
      throw new Error('Experiment not found');
    }

    // Don't allow updates to running experiments (except status)
    if (existing.status === 'running' && updates.status !== 'paused') {
      throw new Error('Cannot update running experiment. Pause it first.');
    }

    if (updates.variants) {
      this.validateTrafficAllocation(updates.variants);
    }

    const experiment = await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        name: updates.name,
        description: updates.description,
        hypothesis: updates.hypothesis,
        status: updates.status,
        variants: updates.variants ? JSON.stringify(updates.variants) : undefined,
        targeting_rules: updates.targeting_rules ? JSON.stringify(updates.targeting_rules) : undefined,
        metrics: updates.metrics ? JSON.stringify(updates.metrics) : undefined,
        start_date: updates.start_date,
        end_date: updates.end_date,
        sample_size: updates.sample_size,
        confidence_level: updates.confidence_level,
        updated_at: new Date(),
      },
    });

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(experimentId: string): Promise<ExperimentConfig | null> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      return null;
    }

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Get all experiments
   */
  async getExperiments(filters?: {
    status?: ExperimentConfig['status'];
    type?: ExperimentConfig['type'];
    created_by?: number;
  }): Promise<ExperimentConfig[]> {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.created_by) where.created_by = filters.created_by;

    const experiments = await prisma.experiment.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return experiments.map(e => this.mapToExperimentConfig(e));
  }

  /**
   * Get active experiments
   */
  async getActiveExperiments(): Promise<ExperimentConfig[]> {
    const experiments = await prisma.experiment.findMany({
      where: {
        status: 'running',
        OR: [
          { end_date: null },
          { end_date: { gte: new Date() } },
        ],
      },
    });

    return experiments.map(e => this.mapToExperimentConfig(e));
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string): Promise<ExperimentConfig> {
    logger.info('Starting experiment', { experiment_id: experimentId });

    const experiment = await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'running',
        start_date: new Date(),
        updated_at: new Date(),
      },
    });

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Pause experiment
   */
  async pauseExperiment(experimentId: string): Promise<ExperimentConfig> {
    logger.info('Pausing experiment', { experiment_id: experimentId });

    const experiment = await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'paused',
        updated_at: new Date(),
      },
    });

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Complete experiment
   */
  async completeExperiment(
    experimentId: string,
    winningVariantId?: string
  ): Promise<ExperimentConfig> {
    logger.info('Completing experiment', {
      experiment_id: experimentId,
      winning_variant: winningVariantId,
    });

    const experiment = await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'completed',
        end_date: new Date(),
        winning_variant_id: winningVariantId,
        updated_at: new Date(),
      },
    });

    return this.mapToExperimentConfig(experiment);
  }

  /**
   * Archive experiment
   */
  async archiveExperiment(experimentId: string): Promise<void> {
    logger.info('Archiving experiment', { experiment_id: experimentId });

    await prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'archived',
        updated_at: new Date(),
      },
    });
  }

  /**
   * Validate traffic allocation sums to 100%
   */
  private validateTrafficAllocation(variants: ExperimentVariant[]): void {
    const total = variants.reduce((sum, v) => sum + v.traffic_allocation, 0);

    if (Math.abs(total - 100) > 0.01) {
      throw new Error(
        `Traffic allocation must sum to 100%. Current total: ${total}%`
      );
    }

    // Ensure all allocations are non-negative
    const hasNegative = variants.some(v => v.traffic_allocation < 0);
    if (hasNegative) {
      throw new Error('Traffic allocation cannot be negative');
    }
  }

  /**
   * Map database record to ExperimentConfig
   */
  private mapToExperimentConfig(experiment: any): ExperimentConfig {
    return {
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      hypothesis: experiment.hypothesis,
      type: experiment.type,
      status: experiment.status,
      variants: JSON.parse(experiment.variants),
      targeting_rules: experiment.targeting_rules
        ? JSON.parse(experiment.targeting_rules)
        : undefined,
      metrics: JSON.parse(experiment.metrics),
      start_date: experiment.start_date,
      end_date: experiment.end_date,
      sample_size: experiment.sample_size,
      confidence_level: experiment.confidence_level,
      created_by: experiment.created_by,
      created_at: experiment.created_at,
      updated_at: experiment.updated_at,
    };
  }

  /**
   * Clone experiment (for iteration)
   */
  async cloneExperiment(
    experimentId: string,
    newName: string,
    createdBy: number
  ): Promise<ExperimentConfig> {
    const original = await this.getExperiment(experimentId);

    if (!original) {
      throw new Error('Experiment not found');
    }

    return this.createExperiment({
      name: newName,
      description: `Cloned from: ${original.name}`,
      hypothesis: original.hypothesis,
      type: original.type,
      status: 'draft',
      variants: original.variants,
      targeting_rules: original.targeting_rules,
      metrics: original.metrics,
      sample_size: original.sample_size,
      confidence_level: original.confidence_level,
      created_by: createdBy,
    });
  }
}

export default ExperimentConfigManager;
