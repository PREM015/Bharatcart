/**
 * Hyperparameter Tuning
 * Purpose: Automated hyperparameter optimization
 * Description: Grid search, random search, Bayesian optimization
 */

import { logger } from '@/lib/logger';
import { TrainingPipeline, PipelineConfig } from '../pipelines/training-pipeline';
import { ExperimentTracking } from './experiment-tracking';

export interface TuningConfig {
  model_type: 'recommendation' | 'fraud_detection' | 'price_prediction';
  base_config: PipelineConfig;
  search_space: Record<string, any>;
  strategy: 'grid' | 'random' | 'bayesian';
  n_trials: number;
  optimization_metric: string;
  optimization_direction: 'maximize' | 'minimize';
}

export interface TuningResult {
  best_params: Record<string, any>;
  best_score: number;
  all_trials: Array<{
    params: Record<string, any>;
    score: number;
    trial_number: number;
  }>;
  experiment_id: string;
}

export class HyperparameterTuning {
  private config: TuningConfig;
  private experimentId?: string;

  constructor(config: TuningConfig) {
    this.config = config;
  }

  /**
   * Run hyperparameter tuning
   */
  async tune(): Promise<TuningResult> {
    logger.info('Starting hyperparameter tuning', {
      strategy: this.config.strategy,
      n_trials: this.config.n_trials,
    });

    // Create experiment
    this.experimentId = await ExperimentTracking.createExperiment({
      name: `${this.config.model_type}_tuning_${Date.now()}`,
      model_type: this.config.model_type,
      description: `Hyperparameter tuning using ${this.config.strategy} search`,
      tags: { type: 'tuning', strategy: this.config.strategy },
    });

    let trials: Array<{
      params: Record<string, any>;
      score: number;
      trial_number: number;
    }> = [];

    switch (this.config.strategy) {
      case 'grid':
        trials = await this.gridSearch();
        break;
      case 'random':
        trials = await this.randomSearch();
        break;
      case 'bayesian':
        trials = await this.bayesianOptimization();
        break;
      default:
        throw new Error(`Unknown strategy: ${this.config.strategy}`);
    }

    // Find best trial
    const bestTrial = this.findBestTrial(trials);

    logger.info('Hyperparameter tuning completed', {
      best_score: bestTrial.score,
      best_params: bestTrial.params,
    });

    return {
      best_params: bestTrial.params,
      best_score: bestTrial.score,
      all_trials: trials,
      experiment_id: this.experimentId,
    };
  }

  /**
   * Grid search
   */
  private async gridSearch(): Promise<any[]> {
    logger.info('Running grid search');

    const paramGrid = this.generateGrid(this.config.search_space);
    const trials: any[] = [];

    for (let i = 0; i < paramGrid.length; i++) {
      const params = paramGrid[i];

      logger.info(`Trial ${i + 1}/${paramGrid.length}`, { params });

      const score = await this.evaluateParams(params, i + 1);

      trials.push({
        params,
        score,
        trial_number: i + 1,
      });
    }

    return trials;
  }

  /**
   * Random search
   */
  private async randomSearch(): Promise<any[]> {
    logger.info('Running random search');

    const trials: any[] = [];

    for (let i = 0; i < this.config.n_trials; i++) {
      const params = this.sampleRandomParams(this.config.search_space);

      logger.info(`Trial ${i + 1}/${this.config.n_trials}`, { params });

      const score = await this.evaluateParams(params, i + 1);

      trials.push({
        params,
        score,
        trial_number: i + 1,
      });
    }

    return trials;
  }

  /**
   * Bayesian optimization (simplified)
   */
  private async bayesianOptimization(): Promise<any[]> {
    logger.info('Running Bayesian optimization');

    const trials: any[] = [];

    // Initial random trials
    const initialTrials = Math.min(5, Math.floor(this.config.n_trials / 2));

    for (let i = 0; i < initialTrials; i++) {
      const params = this.sampleRandomParams(this.config.search_space);
      const score = await this.evaluateParams(params, i + 1);

      trials.push({
        params,
        score,
        trial_number: i + 1,
      });
    }

    // Bayesian optimization trials
    for (let i = initialTrials; i < this.config.n_trials; i++) {
      const params = this.selectNextParams(trials);
      const score = await this.evaluateParams(params, i + 1);

      trials.push({
        params,
        score,
        trial_number: i + 1,
      });
    }

    return trials;
  }

  /**
   * Evaluate parameter configuration
   */
  private async evaluateParams(
    params: Record<string, any>,
    trialNumber: number
  ): Promise<number> {
    // Create run
    const runId = await ExperimentTracking.startRun({
      experiment_id: this.experimentId!,
      run_name: `trial_${trialNumber}`,
      parameters: params,
      tags: { trial_number: trialNumber.toString() },
    });

    try {
      // Update config with new params
      const config = this.updateConfig(this.config.base_config, params);

      // Run training pipeline
      const pipeline = new TrainingPipeline(config);
      const result = await pipeline.run();

      // Extract metric
      const score = this.extractMetric(result.metrics, this.config.optimization_metric);

      // Log results
      await ExperimentTracking.logMetrics(runId, result.metrics);
      await ExperimentTracking.endRun(runId, 'SUCCESS');

      return score;
    } catch (error) {
      logger.error('Trial failed', { trial_number: trialNumber, error });
      await ExperimentTracking.endRun(runId, 'FAILED');
      return this.config.optimization_direction === 'maximize' ? -Infinity : Infinity;
    }
  }

  /**
   * Generate parameter grid
   */
  private generateGrid(searchSpace: Record<string, any>): Record<string, any>[] {
    const keys = Object.keys(searchSpace);
    const grid: Record<string, any>[] = [];

    const generate = (index: number, current: Record<string, any>) => {
      if (index === keys.length) {
        grid.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = searchSpace[key];

      if (Array.isArray(values)) {
        for (const value of values) {
          generate(index + 1, { ...current, [key]: value });
        }
      }
    };

    generate(0, {});

    return grid;
  }

  /**
   * Sample random parameters
   */
  private sampleRandomParams(searchSpace: Record<string, any>): Record<string, any> {
    const params: Record<string, any> = {};

    for (const [key, spec] of Object.entries(searchSpace)) {
      if (Array.isArray(spec)) {
        // Categorical
        params[key] = spec[Math.floor(Math.random() * spec.length)];
      } else if (typeof spec === 'object' && spec.type) {
        // Continuous
        if (spec.type === 'uniform') {
          params[key] = spec.min + Math.random() * (spec.max - spec.min);
        } else if (spec.type === 'log_uniform') {
          const logMin = Math.log(spec.min);
          const logMax = Math.log(spec.max);
          params[key] = Math.exp(logMin + Math.random() * (logMax - logMin));
        } else if (spec.type === 'int') {
          params[key] = Math.floor(
            spec.min + Math.random() * (spec.max - spec.min + 1)
          );
        }
      }
    }

    return params;
  }

  /**
   * Select next parameters for Bayesian optimization
   */
  private selectNextParams(trials: any[]): Record<string, any> {
    // Simplified: Use best params so far and add some exploration
    const bestTrial = this.findBestTrial(trials);

    const explorationRate = 0.2;
    const params: Record<string, any> = {};

    for (const [key, value] of Object.entries(bestTrial.params)) {
      if (Math.random() < explorationRate) {
        // Explore
        const spec = this.config.search_space[key];
        if (Array.isArray(spec)) {
          params[key] = spec[Math.floor(Math.random() * spec.length)];
        } else {
          params[key] = this.sampleRandomParams({ [key]: spec })[key];
        }
      } else {
        // Exploit
        params[key] = value;
      }
    }

    return params;
  }

  /**
   * Find best trial
   */
  private findBestTrial(trials: any[]): any {
    if (trials.length === 0) {
      throw new Error('No trials to evaluate');
    }

    let best = trials[0];

    for (const trial of trials) {
      if (this.config.optimization_direction === 'maximize') {
        if (trial.score > best.score) {
          best = trial;
        }
      } else {
        if (trial.score < best.score) {
          best = trial;
        }
      }
    }

    return best;
  }

  /**
   * Update config with new parameters
   */
  private updateConfig(
    baseConfig: PipelineConfig,
    params: Record<string, any>
  ): PipelineConfig {
    const config = JSON.parse(JSON.stringify(baseConfig));

    // Update model config
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('model_')) {
        config.model_config[key.replace('model_', '')] = value;
      } else if (key.startsWith('training_')) {
        config.training_config[key.replace('training_', '')] = value;
      } else {
        config.model_config[key] = value;
      }
    }

    return config;
  }

  /**
   * Extract metric from results
   */
  private extractMetric(metrics: any, metricName: string): number {
    if (typeof metrics === 'object' && metricName in metrics) {
      return metrics[metricName];
    }

    throw new Error(`Metric ${metricName} not found in results`);
  }

  /**
   * Export tuning results
   */
  async exportResults(outputPath: string): Promise<void> {
    if (!this.experimentId) {
      throw new Error('No experiment to export');
    }

    const experimentData = await ExperimentTracking.exportExperiment(
      this.experimentId
    );

    // In real implementation, save to file
    logger.info('Tuning results exported', { path: outputPath });
  }
}

export default HyperparameterTuning;
