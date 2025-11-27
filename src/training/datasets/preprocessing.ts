/**
 * Data Preprocessing
 * Purpose: Preprocess and normalize training data
 * Description: Feature engineering, normalization, encoding
 */

import { logger } from '@/lib/logger';
import * as tf from '@tensorflow/tfjs-node';

export interface PreprocessingConfig {
  normalize: boolean;
  standardize: boolean;
  encode_categorical: boolean;
  handle_missing: 'drop' | 'mean' | 'median' | 'mode' | 'zero';
  remove_outliers: boolean;
  outlier_threshold: number; // Standard deviations
}

export interface FeatureStatistics {
  mean: number[];
  std: number[];
  min: number[];
  max: number[];
  median: number[];
  categorical_mappings: Map<number, Map<any, number>>;
}

export class DataPreprocessing {
  private config: PreprocessingConfig;
  private statistics?: FeatureStatistics;

  constructor(config: PreprocessingConfig) {
    this.config = config;
  }

  /**
   * Fit preprocessing on training data
   */
  fit(features: number[][]): FeatureStatistics {
    logger.info('Fitting preprocessing on training data');

    const numFeatures = features[0].length;
    const numSamples = features.length;

    const statistics: FeatureStatistics = {
      mean: new Array(numFeatures).fill(0),
      std: new Array(numFeatures).fill(0),
      min: new Array(numFeatures).fill(Infinity),
      max: new Array(numFeatures).fill(-Infinity),
      median: new Array(numFeatures).fill(0),
      categorical_mappings: new Map(),
    };

    // Calculate mean, min, max
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map(f => f[i]).filter(v => v !== null && !isNaN(v));

      if (values.length === 0) continue;

      statistics.mean[i] = values.reduce((sum, v) => sum + v, 0) / values.length;
      statistics.min[i] = Math.min(...values);
      statistics.max[i] = Math.max(...values);
      statistics.median[i] = this.calculateMedian(values);
    }

    // Calculate standard deviation
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map(f => f[i]).filter(v => v !== null && !isNaN(v));
      const mean = statistics.mean[i];
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      statistics.std[i] = Math.sqrt(variance);
    }

    this.statistics = statistics;

    logger.info('Preprocessing fitted', {
      num_features: numFeatures,
      num_samples: numSamples,
    });

    return statistics;
  }

  /**
   * Transform features using fitted statistics
   */
  transform(features: number[][]): number[][] {
    if (!this.statistics) {
      throw new Error('Preprocessing not fitted. Call fit() first.');
    }

    logger.info('Transforming features');

    let transformed = [...features.map(f => [...f])];

    // Handle missing values
    if (this.config.handle_missing !== 'drop') {
      transformed = this.handleMissingValues(transformed);
    }

    // Remove outliers
    if (this.config.remove_outliers) {
      transformed = this.removeOutliers(transformed);
    }

    // Normalize or standardize
    if (this.config.normalize) {
      transformed = this.normalize(transformed);
    } else if (this.config.standardize) {
      transformed = this.standardize(transformed);
    }

    logger.info(`Transformed ${transformed.length} samples`);

    return transformed;
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(features: number[][]): number[][] {
    this.fit(features);
    return this.transform(features);
  }

  /**
   * Handle missing values
   */
  private handleMissingValues(features: number[][]): number[][] {
    const { handle_missing } = this.config;
    const { mean, median } = this.statistics!;

    return features.map(sample =>
      sample.map((value, i) => {
        if (value === null || isNaN(value)) {
          switch (handle_missing) {
            case 'mean':
              return mean[i];
            case 'median':
              return median[i];
            case 'zero':
              return 0;
            default:
              return value;
          }
        }
        return value;
      })
    );
  }

  /**
   * Remove outliers using z-score
   */
  private removeOutliers(features: number[][]): number[][] {
    const { mean, std } = this.statistics!;
    const threshold = this.config.outlier_threshold;

    return features.filter(sample => {
      return sample.every((value, i) => {
        if (std[i] === 0) return true; // Skip if no variance
        const zScore = Math.abs((value - mean[i]) / std[i]);
        return zScore <= threshold;
      });
    });
  }

  /**
   * Normalize to [0, 1] range
   */
  private normalize(features: number[][]): number[][] {
    const { min, max } = this.statistics!;

    return features.map(sample =>
      sample.map((value, i) => {
        const range = max[i] - min[i];
        if (range === 0) return 0;
        return (value - min[i]) / range;
      })
    );
  }

  /**
   * Standardize to zero mean and unit variance
   */
  private standardize(features: number[][]): number[][] {
    const { mean, std } = this.statistics!;

    return features.map(sample =>
      sample.map((value, i) => {
        if (std[i] === 0) return 0;
        return (value - mean[i]) / std[i];
      })
    );
  }

  /**
   * One-hot encode categorical features
   */
  oneHotEncode(
    features: number[][],
    categoricalIndices: number[]
  ): number[][] {
    logger.info('One-hot encoding categorical features');

    const encoded: number[][] = [];

    for (const sample of features) {
      const encodedSample: number[] = [];

      for (let i = 0; i < sample.length; i++) {
        if (categoricalIndices.includes(i)) {
          // Get unique values for this feature
          const uniqueValues = [
            ...new Set(features.map(f => f[i])),
          ].sort();

          // One-hot encode
          const oneHot = uniqueValues.map(v => (sample[i] === v ? 1 : 0));
          encodedSample.push(...oneHot);
        } else {
          encodedSample.push(sample[i]);
        }
      }

      encoded.push(encodedSample);
    }

    logger.info(
      `Encoded features from ${features[0].length} to ${encoded[0].length} dimensions`
    );

    return encoded;
  }

  /**
   * Label encode categorical features
   */
  labelEncode(
    features: number[][],
    categoricalIndices: number[]
  ): number[][] {
    const mappings = new Map<number, Map<any, number>>();

    // Create mappings
    for (const index of categoricalIndices) {
      const uniqueValues = [...new Set(features.map(f => f[index]))];
      const mapping = new Map(uniqueValues.map((v, i) => [v, i]));
      mappings.set(index, mapping);
    }

    // Apply encoding
    return features.map(sample =>
      sample.map((value, i) => {
        if (categoricalIndices.includes(i)) {
          const mapping = mappings.get(i)!;
          return mapping.get(value) ?? 0;
        }
        return value;
      })
    );
  }

  /**
   * Create polynomial features
   */
  polynomialFeatures(features: number[][], degree: number = 2): number[][] {
    logger.info(`Creating polynomial features of degree ${degree}`);

    return features.map(sample => {
      const poly: number[] = [...sample];

      // Add interaction terms
      if (degree >= 2) {
        for (let i = 0; i < sample.length; i++) {
          for (let j = i; j < sample.length; j++) {
            poly.push(sample[i] * sample[j]);
          }
        }
      }

      // Add cubic terms
      if (degree >= 3) {
        for (let i = 0; i < sample.length; i++) {
          poly.push(Math.pow(sample[i], 3));
        }
      }

      return poly;
    });
  }

  /**
   * Feature selection using variance threshold
   */
  selectByVariance(
    features: number[][],
    threshold: number = 0.01
  ): {
    features: number[][];
    selectedIndices: number[];
  } {
    const { std } = this.statistics!;

    const selectedIndices = std
      .map((s, i) => ({ std: s, index: i }))
      .filter(({ std }) => std > threshold)
      .map(({ index }) => index);

    const selectedFeatures = features.map(sample =>
      selectedIndices.map(i => sample[i])
    );

    logger.info(
      `Selected ${selectedIndices.length} features from ${features[0].length} using variance threshold`
    );

    return {
      features: selectedFeatures,
      selectedIndices,
    };
  }

  /**
   * Principal Component Analysis (PCA)
   */
  async pca(features: number[][], numComponents: number): Promise<number[][]> {
    logger.info(`Performing PCA with ${numComponents} components`);

    // Standardize first
    const standardized = this.standardize(features);

    // Convert to tensor
    const featureTensor = tf.tensor2d(standardized);

    // Calculate covariance matrix
    const mean = featureTensor.mean(0);
    const centered = featureTensor.sub(mean);
    const cov = centered.transpose().matMul(centered).div(features.length);

    // Compute eigenvalues and eigenvectors
    const { values, vectors } = await tf.linalg.eigh(cov);

    // Sort by eigenvalues
    const sortedIndices = Array.from(
      await values.array() as number[]
    )
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => b.value - a.value)
      .map(({ index }) => index)
      .slice(0, numComponents);

    // Select top components
    const selectedVectors = vectors.gather(sortedIndices, 1);

    // Transform data
    const transformed = centered.matMul(selectedVectors);
    const result = await transformed.array() as number[][];

    // Cleanup tensors
    featureTensor.dispose();
    mean.dispose();
    centered.dispose();
    cov.dispose();
    values.dispose();
    vectors.dispose();
    selectedVectors.dispose();
    transformed.dispose();

    logger.info(`Reduced features to ${numComponents} components`);

    return result;
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Get feature importance (correlation with labels)
   */
  calculateFeatureImportance(
    features: number[][],
    labels: number[]
  ): number[] {
    const numFeatures = features[0].length;
    const importance: number[] = [];

    for (let i = 0; i < numFeatures; i++) {
      const featureValues = features.map(f => f[i]);
      const correlation = this.pearsonCorrelation(featureValues, labels);
      importance.push(Math.abs(correlation));
    }

    return importance;
  }

  /**
   * Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((sum, v) => sum + v, 0) / n;
    const meanY = y.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }

    if (denomX === 0 || denomY === 0) return 0;

    return numerator / Math.sqrt(denomX * denomY);
  }

  /**
   * Save preprocessing statistics
   */
  saveStatistics(path: string): void {
    if (!this.statistics) {
      throw new Error('No statistics to save');
    }

    const serializable = {
      mean: this.statistics.mean,
      std: this.statistics.std,
      min: this.statistics.min,
      max: this.statistics.max,
      median: this.statistics.median,
      categorical_mappings: Array.from(
        this.statistics.categorical_mappings.entries()
      ).map(([key, value]) => [key, Array.from(value.entries())]),
    };

    // In real implementation, save to file
    logger.info(`Preprocessing statistics saved to ${path}`);
  }

  /**
   * Load preprocessing statistics
   */
  loadStatistics(path: string): void {
    // In real implementation, load from file
    logger.info(`Preprocessing statistics loaded from ${path}`);
  }
}

export default DataPreprocessing;
