/**
 * Price Prediction Model
 * Purpose: Predict optimal product pricing using ML
 * Description: Time series forecasting with LSTM and regression
 */

import * as tf from '@tensorflow/tfjs-node';
import { logger } from '@/lib/logger';

export interface PricePredictionConfig {
  input_dim: number;
  sequence_length: number;
  lstm_units: number[];
  dense_units: number[];
  dropout_rate: number;
  learning_rate: number;
  use_attention: boolean;
}

export class PricePredictionModel {
  private model?: tf.LayersModel;
  private config: PricePredictionConfig;

  constructor(config: PricePredictionConfig) {
    this.config = config;
  }

  /**
   * Build LSTM model for price prediction
   */
  buildLSTM(): tf.LayersModel {
    logger.info('Building price prediction LSTM model');

    const input = tf.input({
      shape: [this.config.sequence_length, this.config.input_dim],
    });

    let layer = input as tf.SymbolicTensor;

    // LSTM layers
    for (let i = 0; i < this.config.lstm_units.length; i++) {
      const returnSequences = i < this.config.lstm_units.length - 1;

      layer = tf.layers
        .lstm({
          units: this.config.lstm_units[i],
          returnSequences,
          recurrentDropout: this.config.dropout_rate,
          name: `lstm_${i}`,
        })
        .apply(layer) as tf.SymbolicTensor;

      layer = tf.layers
        .dropout({ rate: this.config.dropout_rate, name: `dropout_lstm_${i}` })
        .apply(layer) as tf.SymbolicTensor;
    }

    // Attention mechanism (optional)
    if (this.config.use_attention) {
      layer = this.addAttentionLayer(layer);
    }

    // Dense layers
    for (let i = 0; i < this.config.dense_units.length; i++) {
      layer = tf.layers
        .dense({
          units: this.config.dense_units[i],
          activation: 'relu',
          name: `dense_${i}`,
        })
        .apply(layer) as tf.SymbolicTensor;

      layer = tf.layers
        .dropout({ rate: this.config.dropout_rate, name: `dropout_dense_${i}` })
        .apply(layer) as tf.SymbolicTensor;
    }

    // Output layer (price prediction)
    const output = tf.layers
      .dense({
        units: 1,
        activation: 'linear',
        name: 'price_output',
      })
      .apply(layer) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: output });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mape'],
    });

    logger.info('Price prediction LSTM model built', {
      total_params: this.model.countParams(),
    });

    return this.model;
  }

  /**
   * Add attention layer
   */
  private addAttentionLayer(input: tf.SymbolicTensor): tf.SymbolicTensor {
    // Simplified attention mechanism
    const attention = tf.layers
      .dense({
        units: 1,
        activation: 'tanh',
        name: 'attention_weights',
      })
      .apply(input) as tf.SymbolicTensor;

    const attentionSoftmax = tf.layers
      .activation({ activation: 'softmax', name: 'attention_softmax' })
      .apply(attention) as tf.SymbolicTensor;

    const context = tf.layers
      .multiply({ name: 'attention_context' })
      .apply([input, attentionSoftmax]) as tf.SymbolicTensor;

    return tf.layers
      .globalAveragePooling1d({ name: 'attention_pool' })
      .apply(context) as tf.SymbolicTensor;
  }

  /**
   * Build regression model for price prediction
   */
  buildRegression(): tf.LayersModel {
    logger.info('Building price prediction regression model');

    const input = tf.input({ shape: [this.config.input_dim] });

    let layer = input as tf.SymbolicTensor;

    // Hidden layers
    const hiddenUnits = [128, 64, 32, 16];
    for (let i = 0; i < hiddenUnits.length; i++) {
      layer = tf.layers
        .dense({
          units: hiddenUnits[i],
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
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

    // Output layer
    const output = tf.layers
      .dense({
        units: 1,
        activation: 'linear',
        name: 'price_output',
      })
      .apply(layer) as tf.SymbolicTensor;

    this.model = tf.model({ inputs: input, outputs: output });

    this.model.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mape'],
    });

    logger.info('Price prediction regression model built');

    return this.model;
  }

  /**
   * Train model
   */
  async train(
    features: number[][] | number[][][],
    prices: number[],
    validationSplit: number = 0.2,
    epochs: number = 100,
    batchSize: number = 32
  ): Promise<tf.History> {
    if (!this.model) {
      throw new Error('Model not built');
    }

    logger.info('Training price prediction model', { epochs, batchSize });

    const isSequence = Array.isArray(features[0][0]);
    const featureTensor = isSequence
      ? tf.tensor3d(features as number[][][])
      : tf.tensor2d(features as number[][]);

    const priceTensor = tf.tensor2d(prices.map(p => [p]));

    const history = await this.model.fit(featureTensor, priceTensor, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          logger.info(`Epoch ${epoch + 1}/${epochs}`, logs);
        },
        earlyStopping: tf.callbacks.earlyStopping({
          monitor: 'val_loss',
          patience: 10,
          restoreBestWeights: true,
        }),
      },
    });

    featureTensor.dispose();
    priceTensor.dispose();

    return history;
  }

  /**
   * Predict optimal price
   */
  async predict(features: number[] | number[][]): Promise<number> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const isSequence = Array.isArray(features[0]);
    const featureTensor = isSequence
      ? tf.tensor3d([features as number[][]])
      : tf.tensor2d([features as number[]]);

    const prediction = this.model.predict(featureTensor) as tf.Tensor;
    const price = (await prediction.data())[0];

    featureTensor.dispose();
    prediction.dispose();

    return price;
  }

  /**
   * Predict price range
   */
  async predictRange(
    features: number[] | number[][],
    confidence: number = 0.95
  ): Promise<{ predicted: number; lower: number; upper: number }> {
    const predicted = await this.predict(features);

    // Monte Carlo dropout for uncertainty estimation
    const predictions: number[] = [];
    const numSamples = 100;

    for (let i = 0; i < numSamples; i++) {
      const pred = await this.predict(features);
      predictions.push(pred);
    }

    predictions.sort((a, b) => a - b);

    const lowerIndex = Math.floor(((1 - confidence) / 2) * numSamples);
    const upperIndex = Math.floor((confidence + (1 - confidence) / 2) * numSamples);

    return {
      predicted,
      lower: predictions[lowerIndex],
      upper: predictions[upperIndex],
    };
  }

  /**
   * Predict price elasticity
   */
  async predictElasticity(
    baseFeatures: number[] | number[][],
    priceChange: number = 0.1
  ): Promise<number> {
    const basePrice = await this.predict(baseFeatures);

    // Modify price feature (assuming it's at specific index)
    const modifiedFeatures = Array.isArray(baseFeatures[0])
      ? (baseFeatures as number[][]).map((seq: number[]) =>
          seq.map((f, i) => (i === 0 ? f * (1 + priceChange) : f))
        )
      : (baseFeatures as number[]).map((f, i) => (i === 0 ? f * (1 + priceChange) : f));

    const newPrice = await this.predict(modifiedFeatures);

    // Calculate elasticity
    const percentChange = (newPrice - basePrice) / basePrice;
    const elasticity = percentChange / priceChange;

    return elasticity;
  }

  /**
   * Optimize price for maximum revenue
   */
  async optimizePrice(
    baseFeatures: number[] | number[][],
    demandFunction: (price: number) => number,
    priceRange: { min: number; max: number },
    steps: number = 100
  ): Promise<{ optimal_price: number; expected_revenue: number }> {
    const priceStep = (priceRange.max - priceRange.min) / steps;
    let maxRevenue = 0;
    let optimalPrice = priceRange.min;

    for (let i = 0; i <= steps; i++) {
      const price = priceRange.min + i * priceStep;

      // Update price in features
      const modifiedFeatures = this.updatePriceInFeatures(baseFeatures, price);

      // Predict demand at this price
      const demand = demandFunction(price);

      // Calculate revenue
      const revenue = price * demand;

      if (revenue > maxRevenue) {
        maxRevenue = revenue;
        optimalPrice = price;
      }
    }

    return {
      optimal_price: optimalPrice,
      expected_revenue: maxRevenue,
    };
  }

  /**
   * Update price in features
   */
  private updatePriceInFeatures(
    features: number[] | number[][],
    newPrice: number
  ): number[] | number[][] {
    if (Array.isArray(features[0])) {
      return (features as number[][]).map((seq: number[]) =>
        seq.map((f, i) => (i === 0 ? newPrice : f))
      );
    }
    return (features as number[]).map((f, i) => (i === 0 ? newPrice : f));
  }

  /**
   * Save model
   */
  async save(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`file://${path}`);
    logger.info(`Model saved to ${path}`);
  }

  /**
   * Load model
   */
  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    logger.info(`Model loaded from ${path}`);
  }
}

export default PricePredictionModel;
