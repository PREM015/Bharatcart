/**
 * Recommendation Model Trainer
 * Purpose: Training pipeline for recommendation model
 * Description: Handles data preparation, training, and evaluation
 */

import { logger } from '@/lib/logger';
import { DataLoader } from '../../datasets/data-loader';
import { DataPreprocessing } from '../../datasets/preprocessing';
import { RecommendationModel } from './model';
import { prisma } from '@/lib/prisma';

export class RecommendationTrainer {
  private dataLoader: DataLoader;
  private preprocessing: DataPreprocessing;
  private model: RecommendationModel;

  constructor() {
    this.dataLoader = new DataLoader({
      name: 'recommendation',
      type: 'recommendation',
      batchSize: 32,
      shuffle: true,
      validation_split: 0.2,
      cache: true,
    });

    this.preprocessing = new DataPreprocessing({
      normalize: true,
      standardize: false,
      encode_categorical: true,
      handle_missing: 'mean',
      remove_outliers: false,
      outlier_threshold: 3,
    });

    // Get dataset sizes
    const numUsers = 10000; // Get from database
    const numProducts = 5000; // Get from database

    this.model = new RecommendationModel({
      num_users: numUsers,
      num_products: numProducts,
      embedding_dim: 64,
      hidden_layers: [128, 64, 32],
      dropout_rate: 0.3,
      learning_rate: 0.001,
      regularization: 0.01,
    });
  }

  /**
   * Train recommendation model
   */
  async train(): Promise<void> {
    logger.info('Starting recommendation model training');

    try {
      // Load data
      const data = await this.dataLoader.loadRecommendationData();

      // Split into train/validation
      const split = this.dataLoader.splitData(data);

      // Extract user IDs, product IDs, and labels
      const { userIds, productIds, labels } = this.extractIds(split.train);

      // Build and train model
      this.model.build();

      const history = await this.model.train(
        userIds,
        productIds,
        labels,
        0.2, // validation split
        50, // epochs
        64 // batch size
      );

      // Evaluate on validation set
      const valData = this.extractIds(split.validation);
      await this.evaluate(valData);

      // Save model
      await this.model.save('models/recommendation');

      logger.info('Recommendation model training completed');
    } catch (error) {
      logger.error('Recommendation model training failed', { error });
      throw error;
    }
  }

  /**
   * Extract user IDs, product IDs, and labels from features
   */
  private extractIds(data: any): {
    userIds: number[];
    productIds: number[];
    labels: number[];
  } {
    // Assuming features format: [userId, productId, ...other features]
    return {
      userIds: data.features.map((f: number[]) => f[0]),
      productIds: data.features.map((f: number[]) => f[1]),
      labels: data.labels,
    };
  }

  /**
   * Evaluate model
   */
  private async evaluate(data: any): Promise<void> {
    logger.info('Evaluating recommendation model');

    const predictions: number[] = [];

    for (let i = 0; i < data.userIds.length; i++) {
      const pred = await this.model.predict(data.userIds[i], data.productIds[i]);
      predictions.push(pred);
    }

    // Calculate metrics
    const mse = this.calculateMSE(predictions, data.labels);
    const mae = this.calculateMAE(predictions, data.labels);
    const accuracy = this.calculateAccuracy(predictions, data.labels, 0.5);

    logger.info('Evaluation metrics', { mse, mae, accuracy });
  }

  private calculateMSE(predictions: number[], labels: number[]): number {
    const errors = predictions.map((p, i) => Math.pow(p - labels[i], 2));
    return errors.reduce((sum, e) => sum + e, 0) / errors.length;
  }

  private calculateMAE(predictions: number[], labels: number[]): number {
    const errors = predictions.map((p, i) => Math.abs(p - labels[i]));
    return errors.reduce((sum, e) => sum + e, 0) / errors.length;
  }

  private calculateAccuracy(
    predictions: number[],
    labels: number[],
    threshold: number
  ): number {
    const correct = predictions.filter(
      (p, i) => (p >= threshold && labels[i] === 1) || (p < threshold && labels[i] === 0)
    ).length;
    return correct / predictions.length;
  }
}

export default RecommendationTrainer;
