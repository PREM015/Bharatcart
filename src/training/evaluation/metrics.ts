/**
 * ML Model Evaluation Metrics
 * Purpose: Comprehensive metrics for model evaluation
 * Description: Classification, regression, and ranking metrics
 */

import { logger } from '@/lib/logger';
import * as tf from '@tensorflow/tfjs-node';

export class EvaluationMetrics {
  /**
   * Calculate classification metrics
   */
  static classificationMetrics(
    yTrue: number[],
    yPred: number[],
    threshold: number = 0.5
  ): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: number[][];
  } {
    const predictions = yPred.map(p => (p >= threshold ? 1 : 0));

    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === 1 && predictions[i] === 1) tp++;
      else if (yTrue[i] === 0 && predictions[i] === 1) fp++;
      else if (yTrue[i] === 0 && predictions[i] === 0) tn++;
      else if (yTrue[i] === 1 && predictions[i] === 0) fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    const auc = this.calculateAUC(yTrue, yPred);

    const confusionMatrix = [
      [tn, fp],
      [fn, tp],
    ];

    return { accuracy, precision, recall, f1Score, auc, confusionMatrix };
  }

  /**
   * Calculate AUC-ROC
   */
  static calculateAUC(yTrue: number[], yPred: number[]): number {
    // Sort by prediction score
    const sorted = yTrue
      .map((label, i) => ({ label, score: yPred[i] }))
      .sort((a, b) => b.score - a.score);

    let tpr = 0;
    let fpr = 0;
    let auc = 0;

    const positives = yTrue.filter(y => y === 1).length;
    const negatives = yTrue.length - positives;

    let prevFpr = 0;

    for (const { label } of sorted) {
      if (label === 1) {
        tpr += 1 / positives;
      } else {
        fpr += 1 / negatives;
        auc += tpr * (fpr - prevFpr);
        prevFpr = fpr;
      }
    }

    return auc;
  }

  /**
   * Calculate regression metrics
   */
  static regressionMetrics(yTrue: number[], yPred: number[]): {
    mse: number;
    rmse: number;
    mae: number;
    mape: number;
    r2Score: number;
  } {
    const n = yTrue.length;

    // Mean Squared Error
    const mse =
      yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0) / n;

    // Root Mean Squared Error
    const rmse = Math.sqrt(mse);

    // Mean Absolute Error
    const mae =
      yTrue.reduce((sum, y, i) => sum + Math.abs(y - yPred[i]), 0) / n;

    // Mean Absolute Percentage Error
    const mape =
      (yTrue.reduce(
        (sum, y, i) => sum + Math.abs((y - yPred[i]) / y),
        0
      ) /
        n) *
      100;

    // R² Score
    const yMean = yTrue.reduce((sum, y) => sum + y, 0) / n;
    const ssTot = yTrue.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = yTrue.reduce(
      (sum, y, i) => sum + Math.pow(y - yPred[i], 2),
      0
    );
    const r2Score = 1 - ssRes / ssTot;

    return { mse, rmse, mae, mape, r2Score };
  }

  /**
   * Calculate ranking metrics (for recommendations)
   */
  static rankingMetrics(
    yTrue: number[][],
    yPred: number[][],
    k: number = 10
  ): {
    precision_at_k: number;
    recall_at_k: number;
    ndcg_at_k: number;
    map: number;
  } {
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalNDCG = 0;
    let totalAP = 0;

    for (let i = 0; i < yTrue.length; i++) {
      const relevant = yTrue[i];
      const predicted = yPred[i];

      // Precision@K
      const topK = predicted.slice(0, k);
      const relevantInTopK = topK.filter((_, idx) => relevant[idx] === 1).length;
      totalPrecision += relevantInTopK / k;

      // Recall@K
      const totalRelevant = relevant.filter(r => r === 1).length;
      totalRecall += totalRelevant > 0 ? relevantInTopK / totalRelevant : 0;

      // NDCG@K
      totalNDCG += this.calculateNDCG(relevant, predicted, k);

      // Average Precision
      totalAP += this.calculateAveragePrecision(relevant, predicted);
    }

    const n = yTrue.length;

    return {
      precision_at_k: totalPrecision / n,
      recall_at_k: totalRecall / n,
      ndcg_at_k: totalNDCG / n,
      map: totalAP / n,
    };
  }

  /**
   * Calculate NDCG (Normalized Discounted Cumulative Gain)
   */
  private static calculateNDCG(
    relevant: number[],
    predicted: number[],
    k: number
  ): number {
    // DCG
    let dcg = 0;
    for (let i = 0; i < Math.min(k, predicted.length); i++) {
      const rel = relevant[i] || 0;
      dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }

    // IDCG
    const sortedRelevant = [...relevant].sort((a, b) => b - a);
    let idcg = 0;
    for (let i = 0; i < Math.min(k, sortedRelevant.length); i++) {
      const rel = sortedRelevant[i];
      idcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }

  /**
   * Calculate Average Precision
   */
  private static calculateAveragePrecision(
    relevant: number[],
    predicted: number[]
  ): number {
    let sumPrecision = 0;
    let numRelevant = 0;

    for (let i = 0; i < predicted.length; i++) {
      if (relevant[i] === 1) {
        numRelevant++;
        const precision = numRelevant / (i + 1);
        sumPrecision += precision;
      }
    }

    return numRelevant > 0 ? sumPrecision / numRelevant : 0;
  }

  /**
   * Cross-validation
   */
  static async crossValidate(
    features: number[][],
    labels: number[],
    model: any,
    kFolds: number = 5
  ): Promise<{
    scores: number[];
    mean: number;
    std: number;
  }> {
    const foldSize = Math.floor(features.length / kFolds);
    const scores: number[] = [];

    for (let fold = 0; fold < kFolds; fold++) {
      logger.info(`Cross-validation fold ${fold + 1}/${kFolds}`);

      // Split data
      const valStart = fold * foldSize;
      const valEnd = valStart + foldSize;

      const trainFeatures = [
        ...features.slice(0, valStart),
        ...features.slice(valEnd),
      ];
      const trainLabels = [...labels.slice(0, valStart), ...labels.slice(valEnd)];

      const valFeatures = features.slice(valStart, valEnd);
      const valLabels = labels.slice(valStart, valEnd);

      // Train model
      await model.train(trainFeatures, trainLabels, 0, 10, 32);

      // Evaluate
      const predictions: number[] = [];
      for (const feature of valFeatures) {
        const pred = await model.predict(feature);
        predictions.push(pred);
      }

      const metrics = this.regressionMetrics(valLabels, predictions);
      scores.push(metrics.r2Score);
    }

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);

    return { scores, mean, std };
  }

  /**
   * Learning curve
   */
  static async learningCurve(
    features: number[][],
    labels: number[],
    model: any,
    trainSizes: number[]
  ): Promise<{
    train_scores: number[];
    val_scores: number[];
  }> {
    const trainScores: number[] = [];
    const valScores: number[] = [];

    for (const size of trainSizes) {
      const numSamples = Math.floor(features.length * size);

      const trainFeatures = features.slice(0, numSamples);
      const trainLabels = labels.slice(0, numSamples);

      const valFeatures = features.slice(numSamples);
      const valLabels = labels.slice(numSamples);

      // Train
      await model.train(trainFeatures, trainLabels, 0, 20, 32);

      // Evaluate on train
      const trainPreds: number[] = [];
      for (const feature of trainFeatures) {
        trainPreds.push(await model.predict(feature));
      }
      const trainMetrics = this.regressionMetrics(trainLabels, trainPreds);
      trainScores.push(trainMetrics.r2Score);

      // Evaluate on validation
      const valPreds: number[] = [];
      for (const feature of valFeatures) {
        valPreds.push(await model.predict(feature));
      }
      const valMetrics = this.regressionMetrics(valLabels, valPreds);
      valScores.push(valMetrics.r2Score);

      logger.info(`Training size: ${size}, Train R²: ${trainMetrics.r2Score.toFixed(4)}, Val R²: ${valMetrics.r2Score.toFixed(4)}`);
    }

    return { train_scores: trainScores, val_scores: valScores };
  }
}

export default EvaluationMetrics;
