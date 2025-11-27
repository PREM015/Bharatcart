/**
 * Price Prediction Model Trainer
 * Purpose: Training pipeline for price prediction
 */

import { logger } from '@/lib/logger';
import { DataLoader } from '../../datasets/data-loader';
import { DataPreprocessing } from '../../datasets/preprocessing';
import { PricePredictionModel } from './model';

export class PricePredictionTrainer {
  private dataLoader: DataLoader;
  private preprocessing: DataPreprocessing;
  private model: PricePredictionModel;

  constructor() {
    this.dataLoader = new DataLoader({
      name: 'price_prediction',
      type: 'price_prediction',
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
      remove_outliers: true,
      outlier_threshold: 3,
    });

    this.model = new PricePredictionModel({
      input_dim: 15,
      sequence_length: 10,
      lstm_units: [128, 64],
      dense_units: [32, 16],
      dropout_rate: 0.2,
      learning_rate: 0.001,
      use_attention: true,
    });
  }

  async train(): Promise<void> {
    logger.info('Starting price prediction model training');

    try {
      const data = await this.dataLoader.loadPricePredictionData();
      const processed = this.preprocessing.fitTransform(data.features);

      this.model.buildRegression();
      await this.model.train(processed, data.labels, 0.2, 100, 32);

      await this.model.save('models/price_prediction');

      logger.info('Price prediction model training completed');
    } catch (error) {
      logger.error('Price prediction training failed', { error });
      throw error;
    }
  }
}

export default PricePredictionTrainer;
