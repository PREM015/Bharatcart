/**
 * ML Data Loader
 * Purpose: Load and manage training datasets
 * Description: Efficient data loading with caching and batching
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import * as tf from '@tensorflow/tfjs-node';

export interface DatasetConfig {
  name: string;
  type: 'recommendation' | 'fraud_detection' | 'price_prediction' | 'classification';
  batchSize: number;
  shuffle: boolean;
  validation_split: number;
  cache: boolean;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  metadata?: Record<string, any>;
}

export class DataLoader {
  private config: DatasetConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: DatasetConfig) {
    this.config = config;
  }

  /**
   * Load recommendation dataset
   */
  async loadRecommendationData(): Promise<TrainingData> {
    logger.info('Loading recommendation dataset');

    try {
      // Get user-product interactions
      const interactions = await prisma.userProductInteraction.findMany({
        select: {
          userId: true,
          productId: true,
          interactionType: true, // view, click, purchase
          rating: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 100000, // Last 100k interactions
      });

      // Get user features
      const users = await prisma.user.findMany({
        select: {
          id: true,
          createdAt: true,
          totalOrders: true,
          totalSpent: true,
          averageOrderValue: true,
          preferredCategories: true,
        },
      });

      // Get product features
      const products = await prisma.product.findMany({
        select: {
          id: true,
          categoryId: true,
          price: true,
          rating: true,
          reviewCount: true,
          salesCount: true,
          viewCount: true,
        },
      });

      // Create feature matrix
      const features: number[][] = [];
      const labels: number[] = [];

      // User feature map
      const userMap = new Map(users.map(u => [u.id, u]));
      const productMap = new Map(products.map(p => [p.id, p]));

      interactions.forEach(interaction => {
        const user = userMap.get(interaction.userId);
        const product = productMap.get(interaction.productId);

        if (!user || !product) return;

        // User features
        const userFeatures = [
          user.totalOrders || 0,
          user.totalSpent || 0,
          user.averageOrderValue || 0,
          this.daysSince(user.createdAt),
        ];

        // Product features
        const productFeatures = [
          product.categoryId,
          product.price / 100, // Normalize
          product.rating || 0,
          product.reviewCount || 0,
          product.salesCount || 0,
          product.viewCount || 0,
        ];

        // Interaction features
        const interactionFeatures = [
          this.encodeInteractionType(interaction.interactionType),
          this.daysSince(interaction.timestamp),
        ];

        features.push([...userFeatures, ...productFeatures, ...interactionFeatures]);
        
        // Label: 1 if purchased, 0 otherwise
        labels.push(interaction.interactionType === 'PURCHASE' ? 1 : 0);
      });

      logger.info(`Loaded ${features.length} recommendation samples`);

      return { features, labels };
    } catch (error) {
      logger.error('Failed to load recommendation data', { error });
      throw error;
    }
  }

  /**
   * Load fraud detection dataset
   */
  async loadFraudDetectionData(): Promise<TrainingData> {
    logger.info('Loading fraud detection dataset');

    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 86400000) }, // Last 90 days
        },
        include: {
          user: {
            select: {
              id: true,
              createdAt: true,
              totalOrders: true,
              failedOrders: true,
              averageOrderValue: true,
            },
          },
          items: {
            select: {
              price: true,
              quantity: true,
            },
          },
          shippingAddress: true,
          billingAddress: true,
        },
      });

      const features: number[][] = [];
      const labels: number[] = [];

      for (const order of orders) {
        const orderFeatures = [
          // Order features
          order.total / 100,
          order.items.length,
          order.items.reduce((sum, item) => sum + item.quantity, 0),
          
          // User features
          order.user?.totalOrders || 0,
          order.user?.failedOrders || 0,
          order.user?.averageOrderValue || 0,
          this.daysSince(order.user?.createdAt || order.createdAt),
          
          // Timing features
          new Date(order.createdAt).getHours(),
          new Date(order.createdAt).getDay(),
          
          // Address features
          order.shippingAddress?.postalCode === order.billingAddress?.postalCode ? 1 : 0,
          order.shippingAddress?.country === order.billingAddress?.country ? 1 : 0,
          
          // Payment features
          order.paymentMethod === 'CARD' ? 1 : 0,
          
          // Velocity features
          await this.getUserOrderVelocity(order.userId, order.createdAt),
        ];

        features.push(orderFeatures);
        
        // Label: 1 if fraudulent, 0 if legitimate
        labels.push(order.isFraud ? 1 : 0);
      }

      logger.info(`Loaded ${features.length} fraud detection samples`);

      return { features, labels };
    } catch (error) {
      logger.error('Failed to load fraud detection data', { error });
      throw error;
    }
  }

  /**
   * Load price prediction dataset
   */
  async loadPricePredictionData(): Promise<TrainingData> {
    logger.info('Loading price prediction dataset');

    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          brand: true,
          priceHistory: {
            orderBy: { createdAt: 'desc' },
            take: 30, // Last 30 price points
          },
        },
      });

      const features: number[][] = [];
      const labels: number[] = [];

      for (const product of products) {
        if (product.priceHistory.length < 5) continue; // Need history

        // Product features
        const productFeatures = [
          product.categoryId,
          product.brand?.id || 0,
          product.stock,
          product.salesCount || 0,
          product.viewCount || 0,
          product.rating || 0,
          product.reviewCount || 0,
        ];

        // Price history features
        const priceHistory = product.priceHistory.slice(0, 10).map(h => h.price / 100);
        const priceFeatures = [
          Math.min(...priceHistory),
          Math.max(...priceHistory),
          priceHistory.reduce((sum, p) => sum + p, 0) / priceHistory.length,
          this.calculateTrend(priceHistory),
          this.calculateVolatility(priceHistory),
        ];

        // Temporal features
        const temporalFeatures = [
          new Date().getMonth(),
          new Date().getDay(),
          this.isHolidaySeason() ? 1 : 0,
        ];

        features.push([...productFeatures, ...priceFeatures, ...temporalFeatures]);
        
        // Label: Current optimal price
        labels.push(product.price / 100);
      }

      logger.info(`Loaded ${features.length} price prediction samples`);

      return { features, labels };
    } catch (error) {
      logger.error('Failed to load price prediction data', { error });
      throw error;
    }
  }

  /**
   * Create TensorFlow dataset
   */
  createTFDataset(data: TrainingData): tf.data.Dataset<tf.TensorContainer> {
    const { features, labels } = data;

    // Convert to tensors
    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor1d(labels);

    // Create dataset
    let dataset = tf.data.zip({
      xs: tf.data.array(features),
      ys: tf.data.array(labels),
    });

    // Shuffle if configured
    if (this.config.shuffle) {
      dataset = dataset.shuffle(features.length);
    }

    // Batch
    dataset = dataset.batch(this.config.batchSize);

    return dataset;
  }

  /**
   * Split data into train/validation sets
   */
  splitData(data: TrainingData): {
    train: TrainingData;
    validation: TrainingData;
  } {
    const splitIndex = Math.floor(
      data.features.length * (1 - this.config.validation_split)
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
   * Cache dataset
   */
  async cacheDataset(key: string, data: TrainingData): Promise<void> {
    if (!this.config.cache) return;

    await redis.setex(
      `ml:dataset:${key}`,
      3600, // 1 hour
      JSON.stringify(data)
    );
  }

  /**
   * Get cached dataset
   */
  async getCachedDataset(key: string): Promise<TrainingData | null> {
    if (!this.config.cache) return null;

    const cached = await redis.get(`ml:dataset:${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Helper: Calculate days since date
   */
  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / 86400000);
  }

  /**
   * Helper: Encode interaction type
   */
  private encodeInteractionType(type: string): number {
    const map: Record<string, number> = {
      VIEW: 0,
      CLICK: 1,
      ADD_TO_CART: 2,
      PURCHASE: 3,
    };
    return map[type] || 0;
  }

  /**
   * Helper: Get user order velocity
   */
  private async getUserOrderVelocity(userId: number, timestamp: Date): Promise<number> {
    const last24h = new Date(timestamp.getTime() - 86400000);

    const recentOrders = await prisma.order.count({
      where: {
        userId,
        createdAt: { gte: last24h, lt: timestamp },
      },
    });

    return recentOrders;
  }

  /**
   * Helper: Calculate price trend
   */
  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;

    let trend = 0;
    for (let i = 1; i < prices.length; i++) {
      trend += prices[i] - prices[i - 1];
    }
    return trend / (prices.length - 1);
  }

  /**
   * Helper: Calculate volatility
   */
  private calculateVolatility(prices: number[]): number {
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  /**
   * Helper: Check if holiday season
   */
  private isHolidaySeason(): boolean {
    const month = new Date().getMonth();
    return month === 10 || month === 11; // November, December
  }

  /**
   * Generate feature statistics
   */
  async generateStatistics(data: TrainingData): Promise<any> {
    const stats: any = {
      total_samples: data.features.length,
      feature_count: data.features[0].length,
      label_distribution: {},
    };

    // Label distribution
    data.labels.forEach(label => {
      stats.label_distribution[label] = (stats.label_distribution[label] || 0) + 1;
    });

    // Feature statistics
    stats.features = [];
    for (let i = 0; i < data.features[0].length; i++) {
      const values = data.features.map(f => f[i]);
      stats.features.push({
        index: i,
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((sum, v) => sum + v, 0) / values.length,
        std: this.calculateStd(values),
      });
    }

    return stats;
  }

  /**
   * Helper: Calculate standard deviation
   */
  private calculateStd(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

export default DataLoader;
