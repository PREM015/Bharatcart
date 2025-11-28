/**
 * Attention Mechanisms
 * Purpose: Focus on relevant parts of input data
 * Types: Self-Attention, Cross-Attention, Multi-Head Attention
 * Use Cases:
 * - Product feature importance
 * - User behavior analysis
 * - Sequence-to-sequence tasks
 */

import { logger } from '@/lib/logger';

export class AttentionMechanism {
  /**
   * Scaled Dot-Product Attention
   */
  scaledDotProductAttention(
    query: number[][],
    key: number[][],
    value: number[][]
  ): number[][] {
    const dk = key[0].length;

    // Compute attention scores
    const scores = this.matmul(query, this.transpose(key));

    // Scale scores
    const scaledScores = scores.map((row) =>
      row.map((val) => val / Math.sqrt(dk))
    );

    // Apply softmax
    const attentionWeights = scaledScores.map((row) => this.softmax(row));

    // Compute weighted sum of values
    return this.matmul(attentionWeights, value);
  }

  /**
   * Multi-Head Attention
   */
  multiHeadAttention(
    query: number[][],
    key: number[][],
    value: number[][],
    numHeads: number
  ): number[][] {
    const headDim = query[0].length / numHeads;

    const outputs: number[][][] = [];

    // Split into heads
    for (let h = 0; h < numHeads; h++) {
      const start = h * headDim;
      const end = start + headDim;

      const qHead = query.map((row) => row.slice(start, end));
      const kHead = key.map((row) => row.slice(start, end));
      const vHead = value.map((row) => row.slice(start, end));

      // Apply attention to each head
      const headOutput = this.scaledDotProductAttention(qHead, kHead, vHead);
      outputs.push(headOutput);
    }

    // Concatenate heads
    return this.concatenateHeads(outputs);
  }

  /**
   * Self-Attention
   */
  selfAttention(input: number[][]): number[][] {
    // Query, Key, and Value are all the same (input)
    return this.scaledDotProductAttention(input, input, input);
  }

  /**
   * Calculate attention weights
   */
  calculateAttentionWeights(
    query: number[],
    keys: number[][]
  ): number[] {
    const scores = keys.map((key) => this.dotProduct(query, key));
    return this.softmax(scores);
  }

  /**
   * Matrix multiplication
   */
  private matmul(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [];

    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  /**
   * Transpose matrix
   */
  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map((row) => row[i]));
  }

  /**
   * Softmax function
   */
  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exps = values.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((exp) => exp / sum);
  }

  /**
   * Dot product
   */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  /**
   * Concatenate attention heads
   */
  private concatenateHeads(heads: number[][][]): number[][] {
    const result: number[][] = [];

    for (let i = 0; i < heads[0].length; i++) {
      const row: number[] = [];
      heads.forEach((head) => {
        row.push(...head[i]);
      });
      result.push(row);
    }

    return result;
  }

  /**
   * Apply attention to product features
   */
  applyFeatureAttention(
    features: Record<string, number>,
    context: number[]
  ): Record<string, number> {
    const featureNames = Object.keys(features);
    const featureValues = Object.values(features);

    // Calculate attention weights
    const weights = this.calculateAttentionWeights(context, [featureValues]);

    // Apply weights to features
    const weightedFeatures: Record<string, number> = {};
    featureNames.forEach((name, i) => {
      weightedFeatures[name] = features[name] * weights[i];
    });

    return weightedFeatures;
  }
}

export default AttentionMechanism;
