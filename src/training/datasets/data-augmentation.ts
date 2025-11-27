/**
 * Data Augmentation
 * Purpose: Augment training data to improve model performance
 * Description: Synthetic data generation and augmentation techniques
 */

import { logger } from '@/lib/logger';
import * as tf from '@tensorflow/tfjs-node';

export interface AugmentationConfig {
  techniques: string[];
  augmentation_factor: number; // How much to augment (e.g., 2 = double the data)
  noise_level: number;
  randomSeed?: number;
}

export class DataAugmentation {
  private config: AugmentationConfig;
  private rng: () => number;

  constructor(config: AugmentationConfig) {
    this.config = config;
    this.rng = this.seededRandom(config.randomSeed || Date.now());
  }

  /**
   * Augment dataset
   */
  augment(features: number[][], labels: number[]): {
    features: number[][];
    labels: number[];
  } {
    logger.info('Augmenting dataset', { config: this.config });

    let augmentedFeatures = [...features];
    let augmentedLabels = [...labels];

    const samplesToGenerate = Math.floor(
      features.length * (this.config.augmentation_factor - 1)
    );

    for (let i = 0; i < samplesToGenerate; i++) {
      const randomIndex = Math.floor(this.rng() * features.length);
      const originalFeature = features[randomIndex];
      const originalLabel = labels[randomIndex];

      let augmentedFeature = [...originalFeature];

      // Apply augmentation techniques
      for (const technique of this.config.techniques) {
        augmentedFeature = this.applyTechnique(technique, augmentedFeature);
      }

      augmentedFeatures.push(augmentedFeature);
      augmentedLabels.push(originalLabel);
    }

    logger.info(
      `Augmented ${features.length} samples to ${augmentedFeatures.length} samples`
    );

    return {
      features: augmentedFeatures,
      labels: augmentedLabels,
    };
  }

  /**
   * Apply augmentation technique
   */
  private applyTechnique(technique: string, features: number[]): number[] {
    switch (technique) {
      case 'noise':
        return this.addNoise(features);
      case 'scaling':
        return this.scaleFeatures(features);
      case 'rotation':
        return this.rotateFeatures(features);
      case 'interpolation':
        return this.interpolateFeatures(features);
      case 'mixup':
        return this.mixupFeatures(features);
      default:
        logger.warn(`Unknown augmentation technique: ${technique}`);
        return features;
    }
  }

  /**
   * Add Gaussian noise
   */
  private addNoise(features: number[]): number[] {
    return features.map(value => {
      const noise = this.gaussianRandom() * this.config.noise_level;
      return value + noise;
    });
  }

  /**
   * Scale features randomly
   */
  private scaleFeatures(features: number[]): number[] {
    const scale = 0.9 + this.rng() * 0.2; // Scale between 0.9 and 1.1
    return features.map(value => value * scale);
  }

  /**
   * Rotate features (useful for time series)
   */
  private rotateFeatures(features: number[]): number[] {
    const rotateBy = Math.floor(this.rng() * features.length);
    return [...features.slice(rotateBy), ...features.slice(0, rotateBy)];
  }

  /**
   * Interpolate between samples
   */
  private interpolateFeatures(features: number[]): number[] {
    // This would need another sample, simplified version adds small variations
    return features.map(value => {
      const variation = (this.rng() - 0.5) * 0.1 * value;
      return value + variation;
    });
  }

  /**
   * MixUp augmentation
   */
  private mixupFeatures(features: number[]): number[] {
    const lambda = this.rng();
    // Simplified mixup with small perturbations
    return features.map(value => value * lambda + value * (1 - lambda) * 0.9);
  }

  /**
   * SMOTE (Synthetic Minority Over-sampling Technique)
   */
  smote(
    features: number[][],
    labels: number[],
    minorityClass: number,
    k: number = 5
  ): {
    features: number[][];
    labels: number[];
  } {
    logger.info(`Applying SMOTE for minority class ${minorityClass}`);

    const minorityIndices = labels
      .map((label, index) => (label === minorityClass ? index : -1))
      .filter(index => index !== -1);

    const syntheticSamples: number[][] = [];

    for (const index of minorityIndices) {
      const sample = features[index];
      const neighbors = this.findKNearestNeighbors(sample, features, k);

      // Generate synthetic sample
      const randomNeighbor = neighbors[Math.floor(this.rng() * neighbors.length)];
      const lambda = this.rng();

      const synthetic = sample.map((value, i) => {
        return value + lambda * (randomNeighbor[i] - value);
      });

      syntheticSamples.push(synthetic);
    }

    logger.info(`Generated ${syntheticSamples.length} synthetic samples using SMOTE`);

    return {
      features: [...features, ...syntheticSamples],
      labels: [...labels, ...Array(syntheticSamples.length).fill(minorityClass)],
    };
  }

  /**
   * Find K nearest neighbors
   */
  private findKNearestNeighbors(
    sample: number[],
    allSamples: number[][],
    k: number
  ): number[][] {
    const distances = allSamples.map((s, index) => ({
      index,
      distance: this.euclideanDistance(sample, s),
    }));

    distances.sort((a, b) => a.distance - b.distance);

    return distances.slice(1, k + 1).map(d => allSamples[d.index]);
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  /**
   * Time series specific augmentation
   */
  augmentTimeSeries(timeSeries: number[][], labels: number[]): {
    features: number[][];
    labels: number[];
  } {
    logger.info('Augmenting time series data');

    const augmented: number[][] = [];
    const augmentedLabels: number[] = [];

    for (let i = 0; i < timeSeries.length; i++) {
      const series = timeSeries[i];
      const label = labels[i];

      // Original
      augmented.push(series);
      augmentedLabels.push(label);

      // Jittering
      augmented.push(this.jitter(series));
      augmentedLabels.push(label);

      // Scaling
      augmented.push(this.timeScale(series));
      augmentedLabels.push(label);

      // Window slicing
      const sliced = this.windowSlice(series);
      if (sliced) {
        augmented.push(sliced);
        augmentedLabels.push(label);
      }
    }

    return {
      features: augmented,
      labels: augmentedLabels,
    };
  }

  /**
   * Jitter time series
   */
  private jitter(series: number[]): number[] {
    return series.map(value => value + this.gaussianRandom() * 0.1);
  }

  /**
   * Time scale
   */
  private timeScale(series: number[]): number[] {
    const scale = 0.9 + this.rng() * 0.2;
    return series.map(value => value * scale);
  }

  /**
   * Window slice
   */
  private windowSlice(series: number[]): number[] | null {
    if (series.length < 10) return null;

    const sliceSize = Math.floor(series.length * 0.8);
    const startIndex = Math.floor(this.rng() * (series.length - sliceSize));

    return series.slice(startIndex, startIndex + sliceSize);
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  /**
   * Gaussian random number
   */
  private gaussianRandom(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Balance dataset
   */
  balanceDataset(features: number[][], labels: number[]): {
    features: number[][];
    labels: number[];
  } {
    logger.info('Balancing dataset');

    // Count class distribution
    const classCounts: Record<number, number> = {};
    labels.forEach(label => {
      classCounts[label] = (classCounts[label] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(classCounts));

    // Oversample minority classes
    const balancedFeatures: number[][] = [...features];
    const balancedLabels: number[] = [...labels];

    for (const [classLabel, count] of Object.entries(classCounts)) {
      const label = parseInt(classLabel);
      const samplesToAdd = maxCount - count;

      if (samplesToAdd <= 0) continue;

      const classIndices = labels
        .map((l, i) => (l === label ? i : -1))
        .filter(i => i !== -1);

      for (let i = 0; i < samplesToAdd; i++) {
        const randomIndex = classIndices[Math.floor(this.rng() * classIndices.length)];
        const augmentedFeature = this.addNoise(features[randomIndex]);

        balancedFeatures.push(augmentedFeature);
        balancedLabels.push(label);
      }
    }

    logger.info(
      `Balanced dataset from ${features.length} to ${balancedFeatures.length} samples`
    );

    return {
      features: balancedFeatures,
      labels: balancedLabels,
    };
  }
}

export default DataAugmentation;
