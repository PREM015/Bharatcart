/**
 * Decision Trees
 * Purpose: Make decisions using trained decision tree models
 * Use Cases:
 * - Product recommendations
 * - Pricing decisions
 * - Inventory allocation
 * - Customer segmentation
 */

import { logger } from '@/lib/logger';

export interface DecisionNode {
  feature: string;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  value?: any;
  samples?: number;
}

export class DecisionTreeClassifier {
  private tree: DecisionNode | null = null;

  /**
   * Train decision tree
   */
  train(data: Array<{ features: Record<string, number>; label: any }>): void {
    logger.info('Training decision tree', { samples: data.length });

    this.tree = this.buildTree(data, 0, 10);
  }

  /**
   * Build tree recursively
   */
  private buildTree(
    data: Array<{ features: Record<string, number>; label: any }>,
    depth: number,
    maxDepth: number
  ): DecisionNode {
    // Stopping criteria
    if (depth >= maxDepth || data.length < 2) {
      return this.createLeafNode(data);
    }

    // Find best split
    const bestSplit = this.findBestSplit(data);

    if (!bestSplit) {
      return this.createLeafNode(data);
    }

    // Split data
    const leftData = data.filter(
      (d) => d.features[bestSplit.feature] <= bestSplit.threshold!
    );
    const rightData = data.filter(
      (d) => d.features[bestSplit.feature] > bestSplit.threshold!
    );

    return {
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      left: this.buildTree(leftData, depth + 1, maxDepth),
      right: this.buildTree(rightData, depth + 1, maxDepth),
      samples: data.length,
    };
  }

  /**
   * Find best feature split
   */
  private findBestSplit(
    data: Array<{ features: Record<string, number>; label: any }>
  ): { feature: string; threshold: number } | null {
    if (data.length === 0) return null;

    const features = Object.keys(data[0].features);
    let bestGini = Infinity;
    let bestSplit: { feature: string; threshold: number } | null = null;

    for (const feature of features) {
      const values = data.map((d) => d.features[feature]).sort((a, b) => a - b);
      const uniqueValues = [...new Set(values)];

      for (const threshold of uniqueValues) {
        const leftData = data.filter((d) => d.features[feature] <= threshold);
        const rightData = data.filter((d) => d.features[feature] > threshold);

        const gini = this.calculateGini(leftData, rightData);

        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = { feature, threshold };
        }
      }
    }

    return bestSplit;
  }

  /**
   * Calculate Gini impurity
   */
  private calculateGini(
    leftData: Array<{ features: Record<string, number>; label: any }>,
    rightData: Array<{ features: Record<string, number>; label: any }>
  ): number {
    const total = leftData.length + rightData.length;

    const leftGini = this.giniImpurity(leftData);
    const rightGini = this.giniImpurity(rightData);

    return (leftData.length / total) * leftGini + (rightData.length / total) * rightGini;
  }

  /**
   * Calculate Gini impurity for dataset
   */
  private giniImpurity(data: Array<{ features: Record<string, number>; label: any }>): number {
    if (data.length === 0) return 0;

    const labelCounts: Record<string, number> = {};
    data.forEach((d) => {
      labelCounts[d.label] = (labelCounts[d.label] || 0) + 1;
    });

    let gini = 1;
    Object.values(labelCounts).forEach((count) => {
      const prob = count / data.length;
      gini -= prob * prob;
    });

    return gini;
  }

  /**
   * Create leaf node
   */
  private createLeafNode(
    data: Array<{ features: Record<string, number>; label: any }>
  ): DecisionNode {
    // Find most common label
    const labelCounts: Record<string, number> = {};
    data.forEach((d) => {
      labelCounts[d.label] = (labelCounts[d.label] || 0) + 1;
    });

    const mostCommonLabel = Object.keys(labelCounts).reduce((a, b) =>
      labelCounts[a] > labelCounts[b] ? a : b
    );

    return {
      feature: '',
      value: mostCommonLabel,
      samples: data.length,
    };
  }

  /**
   * Predict using trained tree
   */
  predict(features: Record<string, number>): any {
    if (!this.tree) {
      throw new Error('Model not trained');
    }

    return this.traverseTree(this.tree, features);
  }

  /**
   * Traverse tree to make prediction
   */
  private traverseTree(node: DecisionNode, features: Record<string, number>): any {
    // Leaf node
    if (node.value !== undefined) {
      return node.value;
    }

    // Decision node
    if (features[node.feature] <= node.threshold!) {
      return this.traverseTree(node.left!, features);
    } else {
      return this.traverseTree(node.right!, features);
    }
  }
}

export default DecisionTreeClassifier;
