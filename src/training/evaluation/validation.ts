/**
 * Model Validation
 * Purpose: Validate models before deployment
 * Description: Performance checks, bias detection, robustness testing
 */

import { logger } from '@/lib/logger';
import { EvaluationMetrics } from './metrics';

export interface ValidationConfig {
  min_accuracy?: number;
  min_precision?: number;
  min_recall?: number;
  min_f1?: number;
  min_auc?: number;
  max_bias?: number;
  robustness_threshold?: number;
}

export interface ValidationResult {
  passed: boolean;
  metrics: any;
  warnings: string[];
  errors: string[];
}

export class ModelValidation {
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Validate classification model
   */
  validateClassifier(
    yTrue: number[],
    yPred: number[],
    threshold: number = 0.5
  ): ValidationResult {
    logger.info('Validating classification model');

    const metrics = EvaluationMetrics.classificationMetrics(
      yTrue,
      yPred,
      threshold
    );

    const warnings: string[] = [];
    const errors: string[] = [];
    let passed = true;

    // Check metrics against thresholds
    if (this.config.min_accuracy && metrics.accuracy < this.config.min_accuracy) {
      errors.push(
        `Accuracy ${metrics.accuracy.toFixed(4)} below threshold ${this.config.min_accuracy}`
      );
      passed = false;
    }

    if (this.config.min_precision && metrics.precision < this.config.min_precision) {
      errors.push(
        `Precision ${metrics.precision.toFixed(4)} below threshold ${this.config.min_precision}`
      );
      passed = false;
    }

    if (this.config.min_recall && metrics.recall < this.config.min_recall) {
      errors.push(
        `Recall ${metrics.recall.toFixed(4)} below threshold ${this.config.min_recall}`
      );
      passed = false;
    }

    if (this.config.min_f1 && metrics.f1Score < this.config.min_f1) {
      errors.push(
        `F1 Score ${metrics.f1Score.toFixed(4)} below threshold ${this.config.min_f1}`
      );
      passed = false;
    }

    if (this.config.min_auc && metrics.auc < this.config.min_auc) {
      errors.push(
        `AUC ${metrics.auc.toFixed(4)} below threshold ${this.config.min_auc}`
      );
      passed = false;
    }

    // Check for class imbalance warnings
    const classBalance = this.checkClassBalance(yTrue);
    if (classBalance.imbalance > 0.8) {
      warnings.push(
        `High class imbalance detected: ${(classBalance.imbalance * 100).toFixed(2)}%`
      );
    }

    // Check for bias
    if (this.config.max_bias) {
      const bias = this.detectBias(yTrue, yPred);
      if (bias > this.config.max_bias) {
        errors.push(`Model bias ${bias.toFixed(4)} exceeds threshold ${this.config.max_bias}`);
        passed = false;
      }
    }

    logger.info('Classification validation completed', {
      passed,
      metrics,
      warnings_count: warnings.length,
      errors_count: errors.length,
    });

    return { passed, metrics, warnings, errors };
  }

  /**
   * Validate regression model
   */
  validateRegressor(yTrue: number[], yPred: number[]): ValidationResult {
    logger.info('Validating regression model');

    const metrics = EvaluationMetrics.regressionMetrics(yTrue, yPred);

    const warnings: string[] = [];
    const errors: string[] = [];
    let passed = true;

    // Check for large errors
    const largeErrors = yTrue.filter(
      (y, i) => Math.abs(y - yPred[i]) / y > 0.5
    ).length;
    const errorRate = largeErrors / yTrue.length;

    if (errorRate > 0.1) {
      warnings.push(
        `${(errorRate * 100).toFixed(2)}% of predictions have >50% error`
      );
    }

    // Check R² score
    if (metrics.r2Score < 0.5) {
      errors.push(`R² score ${metrics.r2Score.toFixed(4)} is too low`);
      passed = false;
    }

    // Check for overfitting patterns
    const residuals = yTrue.map((y, i) => y - yPred[i]);
    const residualPattern = this.checkResidualPattern(residuals);

    if (residualPattern.hasPattern) {
      warnings.push('Residuals show systematic pattern - possible overfitting');
    }

    logger.info('Regression validation completed', { passed, metrics });

    return { passed, metrics, warnings, errors };
  }

  /**
   * Check class balance
   */
  private checkClassBalance(labels: number[]): {
    positives: number;
    negatives: number;
    imbalance: number;
  } {
    const positives = labels.filter(l => l === 1).length;
    const negatives = labels.length - positives;
    const imbalance = Math.abs(positives - negatives) / labels.length;

    return { positives, negatives, imbalance };
  }

  /**
   * Detect model bias
   */
  private detectBias(yTrue: number[], yPred: number[]): number {
    // Calculate bias as difference in prediction rates between classes
    const predictions = yPred.map(p => (p >= 0.5 ? 1 : 0));

    const truePositiveRate = predictions.filter(
      (p, i) => p === 1 && yTrue[i] === 1
    ).length;
    const falsePositiveRate = predictions.filter(
      (p, i) => p === 1 && yTrue[i] === 0
    ).length;

    const bias = Math.abs(truePositiveRate - falsePositiveRate) / yTrue.length;

    return bias;
  }

  /**
   * Check residual pattern
   */
  private checkResidualPattern(residuals: number[]): {
    hasPattern: boolean;
    autocorrelation: number;
  } {
    // Calculate autocorrelation
    const mean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < residuals.length - 1; i++) {
      numerator += (residuals[i] - mean) * (residuals[i + 1] - mean);
    }

    for (let i = 0; i < residuals.length; i++) {
      denominator += Math.pow(residuals[i] - mean, 2);
    }

    const autocorrelation = numerator / denominator;
    const hasPattern = Math.abs(autocorrelation) > 0.3;

    return { hasPattern, autocorrelation };
  }

  /**
   * Test model robustness
   */
  async testRobustness(
    model: any,
    features: number[][],
    noiseLevel: number = 0.1
  ): Promise<{
    robust: boolean;
    performance_drop: number;
  }> {
    logger.info('Testing model robustness');

    // Get baseline predictions
    const baselinePreds: number[] = [];
    for (const feature of features) {
      baselinePreds.push(await model.predict(feature));
    }

    // Add noise and predict
    const noisyFeatures = features.map(f =>
      f.map(val => val + (Math.random() - 0.5) * noiseLevel * val)
    );

    const noisyPreds: number[] = [];
    for (const feature of noisyFeatures) {
      noisyPreds.push(await model.predict(feature));
    }

    // Calculate performance drop
    const performanceDrop =
      baselinePreds.reduce(
        (sum, pred, i) => sum + Math.abs(pred - noisyPreds[i]),
        0
      ) / baselinePreds.length;

    const threshold = this.config.robustness_threshold || 0.1;
    const robust = performanceDrop < threshold;

    logger.info('Robustness test completed', { robust, performanceDrop });

    return { robust, performance_drop: performanceDrop };
  }

  /**
   * Validate model fairness
   */
  validateFairness(
    yTrue: number[],
    yPred: number[],
    sensitiveAttribute: number[]
  ): {
    fair: boolean;
    demographic_parity: number;
    equal_opportunity: number;
  } {
    logger.info('Validating model fairness');

    const predictions = yPred.map(p => (p >= 0.5 ? 1 : 0));

    // Demographic parity: P(Ŷ=1|S=0) ≈ P(Ŷ=1|S=1)
    const group0Predictions = predictions.filter((p, i) => sensitiveAttribute[i] === 0);
    const group1Predictions = predictions.filter((p, i) => sensitiveAttribute[i] === 1);

    const group0PositiveRate =
      group0Predictions.filter(p => p === 1).length / group0Predictions.length;
    const group1PositiveRate =
      group1Predictions.filter(p => p === 1).length / group1Predictions.length;

    const demographicParity = Math.abs(group0PositiveRate - group1PositiveRate);

    // Equal opportunity: P(Ŷ=1|Y=1,S=0) ≈ P(Ŷ=1|Y=1,S=1)
    const group0TPR = predictions.filter(
      (p, i) => p === 1 && yTrue[i] === 1 && sensitiveAttribute[i] === 0
    ).length;
    const group1TPR = predictions.filter(
      (p, i) => p === 1 && yTrue[i] === 1 && sensitiveAttribute[i] === 1
    ).length;

    const equalOpportunity = Math.abs(group0TPR - group1TPR);

    const fair = demographicParity < 0.1 && equalOpportunity < 0.1;

    return { fair, demographic_parity: demographicParity, equal_opportunity: equalOpportunity };
  }
}

export default ModelValidation;
