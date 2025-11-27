/**
 * Fraud Detection Model
 * Purpose: Detect fraudulent transactions using deep learning
 * Description: Anomaly detection with autoencoders and classification
 */

import * as tf from '@tensorflow/tfjs-node';
import { logger } from '@/lib/logger';

export interface FraudDetectionConfig {
  input_dim: number;
  encoding_dim: number;
  hidden_layers: number[];
  dropout_rate: number;
  learning_rate: number;
  class_weight?: { 0: number; 1: number };
}

export class FraudDetectionModel {
  private model?: tf.LayersModel;
  private autoencoder?: tf.LayersModel;
  private config: FraudDetectionConfig;

  constructor(config: FraudDetectionConfig) {
    this.config = config;
  }

  /**
   * Build classification model for fraud detection
   */
  buildClassifier(): tf.LayersModel {
    logger.info('Building fraud detection classifier');

    const input = tf.input({ shape: [this.config.input_dim] });

    let layer = input as tf.SymbolicTensor;

    // Hidden layers
    for (let i = 0; i < this.config.hidden_layers.length; i++) {
      layer = tf.layers
        .dense({
          units: this.config.hidden_layers[i],
          activation: 'relu',
          kernelInitializer: 'heNormal',
          name: `dense_${i}`,
        })
        .apply(layer) as tf.SymbolicTensor;

      layer = tf.layers
        .batchNormalization({ name: `batch_norm_${i}` })
        .apply(layer) as tf.SymbolicTensor;

      layer = tf.layers
        .dropout({ rate: this.config.dropout_rate, name: `dropout_${i}` })
        .apply(layer) as tf.SymbolicTensor;
    }

    // Output layer (binary classification)
    const output = tf.layers
      .dense({
        units: 1,
        activation: 'sigmoid',
        name: 'output',
      })
      .apply(layer) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: output });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall'],
    });

    logger.info('Fraud detection classifier built');

    return this.model;
  }

  /**
   * Build autoencoder for anomaly detection
   */
  buildAutoencoder(): tf.LayersModel {
    logger.info('Building fraud detection autoencoder');

    const input = tf.input({ shape: [this.config.input_dim] });

    // Encoder
    let encoded = input as tf.SymbolicTensor;
    const encoderLayers = [128, 64, this.config.encoding_dim];

    for (let i = 0; i < encoderLayers.length; i++) {
      encoded = tf.layers
        .dense({
          units: encoderLayers[i],
          activation: i === encoderLayers.length - 1 ? 'linear' : 'relu',
          name: `encoder_${i}`,
        })
        .apply(encoded) as tf.SymbolicTensor;
    }

    // Decoder
    let decoded = encoded;
    const decoderLayers = [64, 128, this.config.input_dim];

    for (let i = 0; i < decoderLayers.length; i++) {
      decoded = tf.layers
        .dense({
          units: decoderLayers[i],
          activation: i === decoderLayers.length - 1 ? 'linear' : 'relu',
          name: `decoder_${i}`,
        })
        .apply(decoded) as tf.SymbolicTensor;
    }

    this.autoencoder = tf.model({ inputs: input, outputs: decoded });

    this.autoencoder.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    logger.info('Fraud detection autoencoder built');

    return this.autoencoder;
  }

  /**
   * Train classifier
   */
  async trainClassifier(
    features: number[][],
    labels: number[],
    validationSplit: number = 0.2,
    epochs: number = 50,
    batchSize: number = 32
  ): Promise<tf.History> {
    if (!this.model) {
      this.buildClassifier();
    }

    logger.info('Training fraud detection classifier');

    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor2d(labels.map(l => [l]));

    // Calculate class weights for imbalanced data
    const classWeight = this.config.class_weight || this.calculateClassWeights(labels);

    const history = await this.model!.fit(featureTensor, labelTensor, {
      epochs,
      batchSize,
      validationSplit,
      classWeight,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          logger.info(`Epoch ${epoch + 1}/${epochs}`, logs);
        },
      },
    });

    featureTensor.dispose();
    labelTensor.dispose();

    return history;
  }

  /**
   * Train autoencoder
   */
  async trainAutoencoder(
    features: number[][],
    epochs: number = 100,
    batchSize: number = 32
  ): Promise<tf.History> {
    if (!this.autoencoder) {
      this.buildAutoencoder();
    }

    logger.info('Training fraud detection autoencoder');

    const featureTensor = tf.tensor2d(features);

    const history = await this.autoencoder!.fit(featureTensor, featureTensor, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          logger.info(`Autoencoder Epoch ${epoch + 1}/${epochs}`, logs);
        },
      },
    });

    featureTensor.dispose();

    return history;
  }

  /**
   * Predict fraud probability
   */
  async predictFraud(features: number[]): Promise<number> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const featureTensor = tf.tensor2d([features]);
    const prediction = this.model.predict(featureTensor) as tf.Tensor;
    const probability = (await prediction.data())[0];

    featureTensor.dispose();
    prediction.dispose();

    return probability;
  }

  /**
   * Detect anomaly using autoencoder
   */
  async detectAnomaly(features: number[]): Promise<number> {
    if (!this.autoencoder) {
      throw new Error('Autoencoder not built or loaded');
    }

    const featureTensor = tf.tensor2d([features]);
    const reconstruction = this.autoencoder.predict(featureTensor) as tf.Tensor;

    // Calculate reconstruction error
    const error = tf.losses.meanSquaredError(featureTensor, reconstruction);
    const errorValue = (await error.data())[0];

    featureTensor.dispose();
    reconstruction.dispose();
    error.dispose();

    return errorValue;
  }

  /**
   * Hybrid prediction (classifier + autoencoder)
   */
  async predictHybrid(features: number[]): Promise<{
    fraud_probability: number;
    anomaly_score: number;
    is_fraud: boolean;
  }> {
    const fraudProb = await this.predictFraud(features);
    const anomalyScore = await this.detectAnomaly(features);

    // Combine scores
    const combinedScore = (fraudProb + (anomalyScore > 0.1 ? 1 : 0)) / 2;

    return {
      fraud_probability: fraudProb,
      anomaly_score: anomalyScore,
      is_fraud: combinedScore > 0.5,
    };
  }

  /**
   * Calculate class weights for imbalanced dataset
   */
  private calculateClassWeights(labels: number[]): { 0: number; 1: number } {
    const positives = labels.filter(l => l === 1).length;
    const negatives = labels.filter(l => l === 0).length;
    const total = labels.length;

    return {
      0: total / (2 * negatives),
      1: total / (2 * positives),
    };
  }

  /**
   * Save models
   */
  async save(path: string): Promise<void> {
    if (this.model) {
      await this.model.save(`file://${path}/classifier`);
    }
    if (this.autoencoder) {
      await this.autoencoder.save(`file://${path}/autoencoder`);
    }
    logger.info(`Models saved to ${path}`);
  }

  /**
   * Load models
   */
  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/classifier/model.json`);
    this.autoencoder = await tf.loadLayersModel(
      `file://${path}/autoencoder/model.json`
    );
    logger.info(`Models loaded from ${path}`);
  }
}

export default FraudDetectionModel;
