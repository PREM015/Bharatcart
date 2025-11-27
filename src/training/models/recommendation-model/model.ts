/**
 * Recommendation Model
 * Purpose: Collaborative filtering and content-based recommendations
 * Description: Neural collaborative filtering with hybrid approach
 */

import * as tf from '@tensorflow/tfjs-node';
import { logger } from '@/lib/logger';

export interface RecommendationModelConfig {
  num_users: number;
  num_products: number;
  embedding_dim: number;
  hidden_layers: number[];
  dropout_rate: number;
  learning_rate: number;
  regularization: number;
}

export class RecommendationModel {
  private model?: tf.LayersModel;
  private config: RecommendationModelConfig;

  constructor(config: RecommendationModelConfig) {
    this.config = config;
  }

  /**
   * Build neural collaborative filtering model
   */
  build(): tf.LayersModel {
    logger.info('Building recommendation model');

    // User input
    const userInput = tf.input({ shape: [1], name: 'user_input' });

    // Product input
    const productInput = tf.input({ shape: [1], name: 'product_input' });

    // User embedding
    const userEmbedding = tf.layers
      .embedding({
        inputDim: this.config.num_users,
        outputDim: this.config.embedding_dim,
        embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.regularization }),
        name: 'user_embedding',
      })
      .apply(userInput) as tf.SymbolicTensor;

    const userFlatten = tf.layers
      .flatten({ name: 'user_flatten' })
      .apply(userEmbedding) as tf.SymbolicTensor;

    // Product embedding
    const productEmbedding = tf.layers
      .embedding({
        inputDim: this.config.num_products,
        outputDim: this.config.embedding_dim,
        embeddingsRegularizer: tf.regularizers.l2({ l2: this.config.regularization }),
        name: 'product_embedding',
      })
      .apply(productInput) as tf.SymbolicTensor;

    const productFlatten = tf.layers
      .flatten({ name: 'product_flatten' })
      .apply(productEmbedding) as tf.SymbolicTensor;

    // Concatenate embeddings
    let merged = tf.layers
      .concatenate({ name: 'concatenate' })
      .apply([userFlatten, productFlatten]) as tf.SymbolicTensor;

    // Hidden layers
    for (let i = 0; i < this.config.hidden_layers.length; i++) {
      merged = tf.layers
        .dense({
          units: this.config.hidden_layers[i],
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: this.config.regularization }),
          name: `dense_${i}`,
        })
        .apply(merged) as tf.SymbolicTensor;

      merged = tf.layers
        .dropout({ rate: this.config.dropout_rate, name: `dropout_${i}` })
        .apply(merged) as tf.SymbolicTensor;
    }

    // Output layer (rating prediction)
    const output = tf.layers
      .dense({
        units: 1,
        activation: 'sigmoid',
        name: 'output',
      })
      .apply(merged) as tf.SymbolicTensor;

    // Create model
    this.model = tf.model({
      inputs: [userInput, productInput],
      outputs: output,
      name: 'recommendation_model',
    });

    // Compile model
    this.model.compile({
      optimizer: tf.train.adam(this.config.learning_rate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'mae'],
    });

    logger.info('Recommendation model built', {
      total_params: this.model.countParams(),
    });

    return this.model;
  }

  /**
   * Train model
   */
  async train(
    userIds: number[],
    productIds: number[],
    labels: number[],
    validationSplit: number = 0.2,
    epochs: number = 10,
    batchSize: number = 32
  ): Promise<tf.History> {
    if (!this.model) {
      this.build();
    }

    logger.info('Training recommendation model', { epochs, batchSize });

    const userTensor = tf.tensor2d(userIds.map(id => [id]));
    const productTensor = tf.tensor2d(productIds.map(id => [id]));
    const labelTensor = tf.tensor2d(labels.map(l => [l]));

    const history = await this.model!.fit([userTensor, productTensor], labelTensor, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          logger.info(`Epoch ${epoch + 1}/${epochs}`, logs);
        },
      },
    });

    // Cleanup tensors
    userTensor.dispose();
    productTensor.dispose();
    labelTensor.dispose();

    return history;
  }

  /**
   * Predict rating for user-product pair
   */
  async predict(userId: number, productId: number): Promise<number> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const userTensor = tf.tensor2d([[userId]]);
    const productTensor = tf.tensor2d([[productId]]);

    const prediction = this.model.predict([userTensor, productTensor]) as tf.Tensor;
    const score = (await prediction.data())[0];

    userTensor.dispose();
    productTensor.dispose();
    prediction.dispose();

    return score;
  }

  /**
   * Get top N recommendations for user
   */
  async recommendForUser(
    userId: number,
    productIds: number[],
    topN: number = 10
  ): Promise<Array<{ productId: number; score: number }>> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const userTensor = tf.tensor2d(Array(productIds.length).fill([userId]));
    const productTensor = tf.tensor2d(productIds.map(id => [id]));

    const predictions = this.model.predict([
      userTensor,
      productTensor,
    ]) as tf.Tensor;
    const scores = await predictions.data();

    userTensor.dispose();
    productTensor.dispose();
    predictions.dispose();

    // Create recommendations
    const recommendations = productIds
      .map((productId, i) => ({
        productId,
        score: scores[i],
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    return recommendations;
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

  /**
   * Get model summary
   */
  summary(): void {
    if (!this.model) {
      throw new Error('Model not built');
    }

    this.model.summary();
  }

  /**
   * Get user embeddings
   */
  async getUserEmbeddings(userIds: number[]): Promise<number[][]> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const embeddingLayer = this.model.getLayer('user_embedding') as tf.layers.Layer;
    const userTensor = tf.tensor2d(userIds.map(id => [id]));

    const embeddings = embeddingLayer.apply(userTensor) as tf.Tensor;
    const embeddingArray = await embeddings.array() as number[][][];

    userTensor.dispose();
    embeddings.dispose();

    return embeddingArray.map(e => e[0]);
  }

  /**
   * Get product embeddings
   */
  async getProductEmbeddings(productIds: number[]): Promise<number[][]> {
    if (!this.model) {
      throw new Error('Model not built or loaded');
    }

    const embeddingLayer = this.model.getLayer('product_embedding') as tf.layers.Layer;
    const productTensor = tf.tensor2d(productIds.map(id => [id]));

    const embeddings = embeddingLayer.apply(productTensor) as tf.Tensor;
    const embeddingArray = await embeddings.array() as number[][][];

    productTensor.dispose();
    embeddings.dispose();

    return embeddingArray.map(e => e[0]);
  }

  /**
   * Find similar products using cosine similarity
   */
  async findSimilarProducts(
    productId: number,
    allProductIds: number[],
    topN: number = 10
  ): Promise<Array<{ productId: number; similarity: number }>> {
    const embeddings = await this.getProductEmbeddings(allProductIds);
    const targetIndex = allProductIds.indexOf(productId);

    if (targetIndex === -1) {
      throw new Error('Product not found');
    }

    const targetEmbedding = embeddings[targetIndex];

    // Calculate cosine similarity
    const similarities = embeddings.map((embedding, i) => ({
      productId: allProductIds[i],
      similarity: this.cosineSimilarity(targetEmbedding, embedding),
    }));

    // Sort and filter
    return similarities
      .filter(s => s.productId !== productId)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topN);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default RecommendationModel;
