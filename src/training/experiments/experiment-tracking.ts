/**
 * ML Experiment Tracking
 * Purpose: Track and compare ML experiments
 * Description: MLflow-style experiment tracking with versioning
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export interface ExperimentMetadata {
  name: string;
  model_type: string;
  description?: string;
  tags?: Record<string, string>;
}

export interface RunConfig {
  experiment_id: string;
  run_name?: string;
  parameters: Record<string, any>;
  tags?: Record<string, string>;
}

export class ExperimentTracking {
  /**
   * Create new experiment
   */
  static async createExperiment(metadata: ExperimentMetadata): Promise<string> {
    logger.info('Creating experiment', { name: metadata.name });

    const experiment = await prisma.mlExperiment.create({
      data: {
        name: metadata.name,
        model_type: metadata.model_type,
        description: metadata.description,
        tags: JSON.stringify(metadata.tags || {}),
        status: 'CREATED',
        created_at: new Date(),
      },
    });

    logger.info('Experiment created', { id: experiment.id });

    return experiment.id.toString();
  }

  /**
   * Start new run within experiment
   */
  static async startRun(config: RunConfig): Promise<string> {
    logger.info('Starting experiment run', {
      experiment_id: config.experiment_id,
    });

    const run = await prisma.mlRun.create({
      data: {
        experiment_id: parseInt(config.experiment_id),
        run_name: config.run_name || `run_${Date.now()}`,
        parameters: JSON.stringify(config.parameters),
        tags: JSON.stringify(config.tags || {}),
        status: 'RUNNING',
        started_at: new Date(),
      },
    });

    return run.id.toString();
  }

  /**
   * Log metrics during run
   */
  static async logMetrics(
    runId: string,
    metrics: Record<string, number>,
    step?: number
  ): Promise<void> {
    const timestamp = Date.now();

    for (const [key, value] of Object.entries(metrics)) {
      await prisma.mlMetric.create({
        data: {
          run_id: parseInt(runId),
          key,
          value,
          step: step || 0,
          timestamp: new Date(timestamp),
        },
      });
    }

    logger.debug('Metrics logged', { run_id: runId, metrics });
  }

  /**
   * Log parameters
   */
  static async logParams(
    runId: string,
    params: Record<string, any>
  ): Promise<void> {
    await prisma.mlRun.update({
      where: { id: parseInt(runId) },
      data: {
        parameters: JSON.stringify(params),
      },
    });

    logger.debug('Parameters logged', { run_id: runId });
  }

  /**
   * Log artifacts (model files, plots, etc.)
   */
  static async logArtifact(
    runId: string,
    artifactPath: string,
    artifactType: string
  ): Promise<void> {
    // Store artifact reference
    await prisma.mlArtifact.create({
      data: {
        run_id: parseInt(runId),
        artifact_path: artifactPath,
        artifact_type: artifactType,
        created_at: new Date(),
      },
    });

    logger.debug('Artifact logged', { run_id: runId, path: artifactPath });
  }

  /**
   * End run
   */
  static async endRun(runId: string, status: 'SUCCESS' | 'FAILED'): Promise<void> {
    await prisma.mlRun.update({
      where: { id: parseInt(runId) },
      data: {
        status,
        ended_at: new Date(),
      },
    });

    logger.info('Run ended', { run_id: runId, status });
  }

  /**
   * Get experiment runs
   */
  static async getExperimentRuns(experimentId: string): Promise<any[]> {
    const runs = await prisma.mlRun.findMany({
      where: { experiment_id: parseInt(experimentId) },
      include: {
        metrics: true,
        artifacts: true,
      },
      orderBy: { started_at: 'desc' },
    });

    return runs;
  }

  /**
   * Compare runs
   */
  static async compareRuns(runIds: string[]): Promise<any> {
    const runs = await prisma.mlRun.findMany({
      where: {
        id: { in: runIds.map(id => parseInt(id)) },
      },
      include: {
        metrics: true,
      },
    });

    // Organize metrics for comparison
    const comparison: any = {
      runs: runs.map(run => ({
        id: run.id,
        name: run.run_name,
        parameters: JSON.parse(run.parameters),
        status: run.status,
      })),
      metrics: {},
    };

    // Collect all metric keys
    const metricKeys = new Set<string>();
    runs.forEach(run => {
      run.metrics.forEach(metric => metricKeys.add(metric.key));
    });

    // Compare metrics across runs
    metricKeys.forEach(key => {
      comparison.metrics[key] = runs.map(run => {
        const metric = run.metrics.find(m => m.key === key);
        return metric ? metric.value : null;
      });
    });

    return comparison;
  }

  /**
   * Get best run by metric
   */
  static async getBestRun(
    experimentId: string,
    metric: string,
    direction: 'maximize' | 'minimize' = 'maximize'
  ): Promise<any> {
    const runs = await this.getExperimentRuns(experimentId);

    if (runs.length === 0) {
      return null;
    }

    let bestRun = runs[0];
    let bestValue = this.getRunMetric(bestRun, metric);

    for (const run of runs) {
      const value = this.getRunMetric(run, metric);

      if (value === null) continue;

      if (direction === 'maximize') {
        if (value > bestValue) {
          bestValue = value;
          bestRun = run;
        }
      } else {
        if (value < bestValue) {
          bestValue = value;
          bestRun = run;
        }
      }
    }

    return bestRun;
  }

  /**
   * Get metric value from run
   */
  private static getRunMetric(run: any, metricKey: string): number | null {
    const metric = run.metrics.find((m: any) => m.key === metricKey);
    return metric ? metric.value : null;
  }

  /**
   * Search experiments
   */
  static async searchExperiments(query: {
    model_type?: string;
    tags?: Record<string, string>;
    status?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (query.model_type) {
      where.model_type = query.model_type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const experiments = await prisma.mlExperiment.findMany({
      where,
      include: {
        runs: {
          orderBy: { started_at: 'desc' },
          take: 5,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Filter by tags if provided
    if (query.tags) {
      return experiments.filter(exp => {
        const expTags = JSON.parse(exp.tags);
        return Object.entries(query.tags!).every(
          ([key, value]) => expTags[key] === value
        );
      });
    }

    return experiments;
  }

  /**
   * Delete experiment
   */
  static async deleteExperiment(experimentId: string): Promise<void> {
    // Delete all runs and associated data
    await prisma.mlRun.deleteMany({
      where: { experiment_id: parseInt(experimentId) },
    });

    // Delete experiment
    await prisma.mlExperiment.delete({
      where: { id: parseInt(experimentId) },
    });

    logger.info('Experiment deleted', { experiment_id: experimentId });
  }

  /**
   * Export experiment data
   */
  static async exportExperiment(experimentId: string): Promise<any> {
    const experiment = await prisma.mlExperiment.findUnique({
      where: { id: parseInt(experimentId) },
      include: {
        runs: {
          include: {
            metrics: true,
            artifacts: true,
          },
        },
      },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        model_type: experiment.model_type,
        description: experiment.description,
        created_at: experiment.created_at,
      },
      runs: experiment.runs.map(run => ({
        id: run.id,
        name: run.run_name,
        parameters: JSON.parse(run.parameters),
        status: run.status,
        metrics: run.metrics.map(m => ({
          key: m.key,
          value: m.value,
          step: m.step,
          timestamp: m.timestamp,
        })),
        artifacts: run.artifacts.map(a => ({
          path: a.artifact_path,
          type: a.artifact_type,
        })),
        started_at: run.started_at,
        ended_at: run.ended_at,
      })),
    };
  }
}

export default ExperimentTracking;
