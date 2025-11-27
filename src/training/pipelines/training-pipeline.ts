/**
 * ML Training Pipeline
 * Purpose: End-to-end automated training workflow
 * Description: Data loading, preprocessing, training, validation, and saving
 */

import { logger } from '@/lib/logger';
import { DataLoader } from '../datasets/data-loader';
import { DataPreprocessing } from '../datasets/preprocessing';
import { DataAugmentation } from '../datasets/data-augmentation';
import { EvaluationMetrics } from '../evaluation/metrics';
import { ModelValidation } from '../evaluation/validation';
import { RecommendationModel } from '../models/recommendation-model/model';
import { FraudDetectionModel } from '../models/fraud-detection-model/model';
import { PricePredictionModel } from '../models/price-prediction-model/model';
import { prisma } from '@/lib/prisma';

export interface PipelineConfig {
  model_type: 'recommendation' | 'fraud_detection' | 'price_prediction';
  data_config: any;
  preprocessing_config: any;
  augmentation_config?: any;
  model_config: any;
  training_config: {
    epochs: number;
    batch_size: number;
    validation_split: number;
    early_stopping: boolean;
    patience: number;
  };
  validation_config: any;
}

export interface PipelineResult {
  success: boolean;
  model_path: string;
  metrics: any;
  validation_result: any;
  training_time: number;
  metadata: any;
}

export class TrainingPipeline {
  private config: PipelineConfig;
  private experimentId?: string;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Run complete training pipeline
   */
  async run(): Promise<PipelineResult> {
    const startTime = Date.now();

    logger.info('Starting training pipeline', {
      model_type: this.config.model_type,
    });

    try {
      // Step 1: Create experiment
      this.experimentId = await this.createExperiment();

      // Step 2: Load data
      const data = await this.loadData();

      // Step 3: Preprocess data
      const preprocessed = await this.preprocessData(data);

      // Step 4: Augment data (if configured)
      const augmented = this.config.augmentation_config
        ? await this.augmentData(preprocessed)
        : preprocessed;

      // Step 5: Split data
      const { train, validation } = this.splitData(augmented);

      // Step 6: Build model
      const model = this.buildModel();

      // Step 7: Train model
      const history = await this.trainModel(model, train, validation);

      // Step 8: Evaluate model
      const metrics = await this.evaluateModel(model, validation);

      // Step 9: Validate model
      const validationResult = await this.validateModel(
        model,
        validation,
        metrics
      );

      if (!validationResult.passed) {
        logger.warn('Model validation failed', {
          errors: validationResult.errors,
        });
      }

      // Step 10: Save model
      const modelPath = await this.saveModel(model);

      // Step 11: Update experiment
      await this.updateExperiment(metrics, validationResult);

      const trainingTime = (Date.now() - startTime) / 1000;

      logger.info('Training pipeline completed', {
        success: validationResult.passed,
        training_time: trainingTime,
      });

      return {
        success: validationResult.passed,
        model_path: modelPath,
        metrics,
        validation_result: validationResult,
        training_time: trainingTime,
        metadata: {
          experiment_id: this.experimentId,
          config: this.config,
        },
      };
    } catch (error) {
      logger.error('Training pipeline failed', { error });

      if (this.experimentId) {
        await this.markExperimentFailed(error);
      }

      throw error;
    }
  }

  /**
   * Create experiment tracking record
   */
  private async createExperiment(): Promise<string> {
    const experiment = await prisma.mlExperiment.create({
      data: {
        name: `${this.config.model_type}_${Date.now()}`,
        model_type: this.config.model_type,
        config: JSON.stringify(this.config),
        status: 'RUNNING',
        started_at: new Date(),
      },
    });

    logger.info('Experiment created', { id: experiment.id });

    return experiment.id.toString();
  }

  /**
   * Load training data
   */
  private async loadData(): Promise<any> {
    logger.info('Loading training data');

    const dataLoader = new DataLoader(this.config.data_config);

    let data;

    switch (this.config.model_type) {
      case 'recommendation':
        data = await dataLoader.loadRecommendationData();
        break;
      case 'fraud_detection':
        data = await dataLoader.loadFraudDetectionData();
        break;
      case 'price_prediction':
        data = await dataLoader.loadPricePredictionData();
        break;
      default:
        throw new Error(`Unknown model type: ${this.config.model_type}`);
    }

    logger.info('Data loaded', {
      samples: data.features.length,
      features: data.features[0].length,
    });

    return data;
  }

  /**
   * Preprocess data
   */
  private async preprocessData(data: any): Promise<any> {
    logger.info('Preprocessing data');

    const preprocessing = new DataPreprocessing(this.config.preprocessing_config);

    const processedFeatures = preprocessing.fitTransform(data.features);

    // Save preprocessing statistics
    await this.savePreprocessingStats(preprocessing);

    return {
      features: processedFeatures,
      labels: data.labels,
    };
  }

  /**
   * Augment data
   */
  private async augmentData(data: any): Promise<any> {
    logger.info('Augmenting data');

    const augmentation = new DataAugmentation(this.config.augmentation_config);

    const augmented = augmentation.augment(data.features, data.labels);

    logger.info('Data augmented', {
      original_size: data.features.length,
      augmented_size: augmented.features.length,
    });

    return {
      features: augmented.features,
      labels: augmented.labels,
    };
  }

  /**
   * Split data into train/validation
   */
  private splitData(data: any): { train: any; validation: any } {
    const splitIndex = Math.floor(
      data.features.length * (1 - this.config.training_config.validation_split)
    );

    return {
      train: {
        features: data.features.slice(0, splitIndex),
        labels: data.labels.slice(0, splitIndex),
      },
      validation: {
        features: data.features.slice(splitIndex),
        labels: data.labels.slice(splitIndex),
      },
    };
  }

  /**
   * Build model based on type
   */
  private buildModel(): any {
    logger.info('Building model');

    switch (this.config.model_type) {
      case 'recommendation':
        const recModel = new RecommendationModel(this.config.model_config);
        return recModel.build();

      case 'fraud_detection':
        const fraudModel = new FraudDetectionModel(this.config.model_config);
        return fraudModel.buildClassifier();

      case 'price_prediction':
        const priceModel = new PricePredictionModel(this.config.model_config);
        return priceModel.buildRegression();

      default:
        throw new Error(`Unknown model type: ${this.config.model_type}`);
    }
  }

  /**
   * Train model
   */
  private async trainModel(model: any, train: any, validation: any): Promise<any> {
    logger.info('Training model', {
      epochs: this.config.training_config.epochs,
      batch_size: this.config.training_config.batch_size,
    });

    // Training logic depends on model type
    // This is a simplified version
    const history = await model.train(
      train.features,
      train.labels,
      this.config.training_config.validation_split,
      this.config.training_config.epochs,
      this.config.training_config.batch_size
    );

    return history;
  }

  /**
   * Evaluate model
   */
  private async evaluateModel(model: any, validation: any): Promise<any> {
    logger.info('Evaluating model');

    const predictions: number[] = [];

    for (const feature of validation.features) {
      const pred = await model.predict(feature);
      predictions.push(pred);
    }

    let metrics;

    if (this.config.model_type === 'fraud_detection') {
      metrics = EvaluationMetrics.classificationMetrics(
        validation.labels,
        predictions
      );
    } else {
      metrics = EvaluationMetrics.regressionMetrics(
        validation.labels,
        predictions
      );
    }

    logger.info('Evaluation completed', { metrics });

    return metrics;
  }

  /**
   * Validate model
   */
  private async validateModel(
    model: any,
    validation: any,
    metrics: any
  ): Promise<any> {
    logger.info('Validating model');

    const validator = new ModelValidation(this.config.validation_config);

    const predictions: number[] = [];
    for (const feature of validation.features) {
      predictions.push(await model.predict(feature));
    }

    let result;

    if (this.config.model_type === 'fraud_detection') {
      result = validator.validateClassifier(validation.labels, predictions);
    } else {
      result = validator.validateRegressor(validation.labels, predictions);
    }

    return result;
  }

  /**
   * Save model
   */
  private async saveModel(model: any): Promise<string> {
    const modelPath = `models/${this.config.model_type}/${this.experimentId}`;

    await model.save(modelPath);

    logger.info('Model saved', { path: modelPath });

    return modelPath;
  }

  /**
   * Save preprocessing statistics
   */
  private async savePreprocessingStats(preprocessing: any): Promise<void> {
    const statsPath = `models/${this.config.model_type}/${this.experimentId}/preprocessing.json`;
    preprocessing.saveStatistics(statsPath);
  }

  /**
   * Update experiment with results
   */
  private async updateExperiment(metrics: any, validationResult: any): Promise<void> {
    await prisma.mlExperiment.update({
      where: { id: parseInt(this.experimentId!) },
      data: {
        status: validationResult.passed ? 'COMPLETED' : 'FAILED',
        metrics: JSON.stringify(metrics),
        validation_result: JSON.stringify(validationResult),
        completed_at: new Date(),
      },
    });
  }

  /**
   * Mark experiment as failed
   */
  private async markExperimentFailed(error: any): Promise<void> {
    await prisma.mlExperiment.update({
      where: { id: parseInt(this.experimentId!) },
      data: {
        status: 'FAILED',
        error_message: error.message,
        completed_at: new Date(),
      },
    });
  }

  /**
   * Run multiple experiments with different configs
   */
  static async runBatch(configs: PipelineConfig[]): Promise<PipelineResult[]> {
    logger.info(`Running batch of ${configs.length} experiments`);

    const results: PipelineResult[] = [];

    for (const config of configs) {
      const pipeline = new TrainingPipeline(config);
      const result = await pipeline.run();
      results.push(result);

      // Delay between experiments
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}

export default TrainingPipeline;
