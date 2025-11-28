/**
 * Experiment Results Analyzer
 * Purpose: Analyze A/B test results and statistical significance
 * Description: Statistical tests, confidence intervals, conversion analysis
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { ExperimentConfig, ExperimentMetric } from './experiment-config';

export interface VariantResults {
  variant_id: string;
  variant_name: string;
  users: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  average_revenue_per_user: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

export interface ExperimentResults {
  experiment_id: string;
  experiment_name: string;
  status: string;
  start_date: Date;
  end_date?: Date;
  total_users: number;
  variants: VariantResults[];
  statistical_significance: {
    is_significant: boolean;
    p_value: number;
    confidence_level: number;
    winning_variant?: string;
    improvement: number; // percentage improvement over control
  };
  metrics: MetricResults[];
}

export interface MetricResults {
  metric_id: string;
  metric_name: string;
  type: 'primary' | 'secondary' | 'guardrail';
  variants: {
    variant_id: string;
    value: number;
    sample_size: number;
  }[];
  statistical_test: {
    test_type: string;
    p_value: number;
    is_significant: boolean;
  };
}

export class ExperimentResultsAnalyzer {
  private readonly Z_SCORE_95 = 1.96; // For 95% confidence
  private readonly Z_SCORE_99 = 2.58; // For 99% confidence

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    logger.info('Analyzing experiment', { experiment_id: experimentId });

    // Get experiment config
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const config: ExperimentConfig = {
      ...experiment,
      variants: JSON.parse(experiment.variants),
      metrics: JSON.parse(experiment.metrics),
      targeting_rules: experiment.targeting_rules
        ? JSON.parse(experiment.targeting_rules)
        : undefined,
    };

    // Get assignment data
    const assignments = await prisma.experimentAssignment.findMany({
      where: { experiment_id: experimentId },
    });

    const totalUsers = assignments.length;

    // Get conversion data for each variant
    const variantResults = await this.getVariantResults(experimentId, config);

    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(
      variantResults,
      config.confidence_level
    );

    // Analyze each metric
    const metricResults = await this.analyzeMetrics(experimentId, config);

    return {
      experiment_id: experimentId,
      experiment_name: experiment.name,
      status: experiment.status,
      start_date: experiment.start_date!,
      end_date: experiment.end_date || undefined,
      total_users: totalUsers,
      variants: variantResults,
      statistical_significance: significance,
      metrics: metricResults,
    };
  }

  /**
   * Get results for each variant
   */
  private async getVariantResults(
    experimentId: string,
    config: ExperimentConfig
  ): Promise<VariantResults[]> {
    const results: VariantResults[] = [];

    for (const variant of config.variants) {
      // Get users assigned to this variant
      const users = await prisma.experimentAssignment.count({
        where: {
          experiment_id: experimentId,
          variant_id: variant.id,
        },
      });

      // Get conversions for primary metric
      const primaryMetric = config.metrics.find(m => m.type === 'primary');
      let conversions = 0;
      let revenue = 0;

      if (primaryMetric) {
        const conversionData = await this.getMetricData(
          experimentId,
          variant.id,
          primaryMetric
        );
        conversions = conversionData.count;
        revenue = conversionData.sum;
      }

      const conversionRate = users > 0 ? conversions / users : 0;
      const arpu = users > 0 ? revenue / users : 0;

      // Calculate confidence interval for conversion rate
      const confidenceInterval = this.calculateConfidenceInterval(
        conversionRate,
        users,
        0.95
      );

      results.push({
        variant_id: variant.id,
        variant_name: variant.name,
        users,
        conversions,
        conversion_rate: conversionRate,
        revenue,
        average_revenue_per_user: arpu,
        confidence_interval: confidenceInterval,
      });
    }

    return results;
  }

  /**
   * Get metric data for variant
   */
  private async getMetricData(
    experimentId: string,
    variantId: string,
    metric: ExperimentMetric
  ): Promise<{ count: number; sum: number }> {
    // Get user IDs for this variant
    const assignments = await prisma.experimentAssignment.findMany({
      where: {
        experiment_id: experimentId,
        variant_id: variantId,
      },
      select: { user_id: true },
    });

    const userIds = assignments.map(a => a.user_id);

    if (userIds.length === 0) {
      return { count: 0, sum: 0 };
    }

    // Get events matching the metric
    const events = await prisma.analyticsEvent.findMany({
      where: {
        user_id: { in: userIds },
        event_type: metric.event_name,
      },
    });

    let count = 0;
    let sum = 0;

    if (metric.aggregation === 'count') {
      count = events.length;
    } else if (metric.aggregation === 'unique') {
      const uniqueUsers = new Set(events.map(e => e.user_id));
      count = uniqueUsers.size;
    } else if (metric.aggregation === 'sum' || metric.aggregation === 'average') {
      sum = events.reduce((total, event) => {
        const props = JSON.parse(event.properties || '{}');
        return total + (Number(props.value) || 0);
      }, 0);
      count = events.length;
    }

    return { count, sum };
  }

  /**
   * Calculate statistical significance using Z-test
   */
  private calculateStatisticalSignificance(
    variants: VariantResults[],
    confidenceLevel: number
  ): {
    is_significant: boolean;
    p_value: number;
    confidence_level: number;
    winning_variant?: string;
    improvement: number;
  } {
    // Find control variant
    const control = variants[0]; // Assuming first variant is control
    const treatment = variants[1]; // Assuming second variant is treatment

    if (!control || !treatment) {
      return {
        is_significant: false,
        p_value: 1,
        confidence_level: confidenceLevel,
        improvement: 0,
      };
    }

    // Calculate pooled standard error
    const p1 = control.conversion_rate;
    const n1 = control.users;
    const p2 = treatment.conversion_rate;
    const n2 = treatment.users;

    const pPooled = (control.conversions + treatment.conversions) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

    // Calculate Z-score
    const zScore = Math.abs((p2 - p1) / se);

    // Calculate p-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(zScore));

    // Determine significance threshold
    const zThreshold = confidenceLevel >= 99 ? this.Z_SCORE_99 : this.Z_SCORE_95;
    const isSignificant = zScore > zThreshold;

    // Calculate improvement percentage
    const improvement = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

    return {
      is_significant: isSignificant,
      p_value: pValue,
      confidence_level: confidenceLevel,
      winning_variant: isSignificant && p2 > p1 ? treatment.variant_id : undefined,
      improvement,
    };
  }

  /**
   * Calculate confidence interval for proportion
   */
  private calculateConfidenceInterval(
    proportion: number,
    sampleSize: number,
    confidence: number
  ): { lower: number; upper: number } {
    if (sampleSize === 0) {
      return { lower: 0, upper: 0 };
    }

    const zScore = confidence >= 0.99 ? this.Z_SCORE_99 : this.Z_SCORE_95;
    const standardError = Math.sqrt((proportion * (1 - proportion)) / sampleSize);
    const margin = zScore * standardError;

    return {
      lower: Math.max(0, proportion - margin),
      upper: Math.min(1, proportion + margin),
    };
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const probability =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - probability : probability;
  }

  /**
   * Analyze all metrics
   */
  private async analyzeMetrics(
    experimentId: string,
    config: ExperimentConfig
  ): Promise<MetricResults[]> {
    const results: MetricResults[] = [];

    for (const metric of config.metrics) {
      const variantData = [];

      for (const variant of config.variants) {
        const data = await this.getMetricData(experimentId, variant.id, metric);

        let value = 0;
        if (metric.aggregation === 'count' || metric.aggregation === 'unique') {
          value = data.count;
        } else if (metric.aggregation === 'sum') {
          value = data.sum;
        } else if (metric.aggregation === 'average') {
          value = data.count > 0 ? data.sum / data.count : 0;
        }

        variantData.push({
          variant_id: variant.id,
          value,
          sample_size: data.count,
        });
      }

      // Perform statistical test
      const testResult = this.performStatisticalTest(variantData);

      results.push({
        metric_id: metric.id,
        metric_name: metric.name,
        type: metric.type,
        variants: variantData,
        statistical_test: testResult,
      });
    }

    return results;
  }

  /**
   * Perform statistical test on metric
   */
  private performStatisticalTest(variants: any[]): {
    test_type: string;
    p_value: number;
    is_significant: boolean;
  } {
    // Simple t-test for two variants
    if (variants.length !== 2) {
      return {
        test_type: 'none',
        p_value: 1,
        is_significant: false,
      };
    }

    const [control, treatment] = variants;

    // Calculate t-statistic (simplified)
    const diff = Math.abs(treatment.value - control.value);
    const pooledSE = Math.sqrt(
      (control.value + treatment.value) /
        (control.sample_size + treatment.sample_size)
    );

    const tStat = pooledSE > 0 ? diff / pooledSE : 0;
    const pValue = 2 * (1 - this.normalCDF(tStat));

    return {
      test_type: 't-test',
      p_value: pValue,
      is_significant: pValue < 0.05,
    };
  }

  /**
   * Calculate sample size needed
   */
  calculateRequiredSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    confidence: number = 0.95,
    power: number = 0.8
  ): number {
    const zAlpha = confidence >= 0.99 ? this.Z_SCORE_99 : this.Z_SCORE_95;
    const zBeta = 0.84; // For 80% power

    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);

    const numerator =
      Math.pow(zAlpha + zBeta, 2) *
      (p1 * (1 - p1) + p2 * (1 - p2));
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
  }

  /**
   * Generate experiment report
   */
  async generateReport(experimentId: string): Promise<string> {
    const results = await this.analyzeExperiment(experimentId);

    let report = `
# Experiment Report: ${results.experiment_name}

## Overview
- **Status**: ${results.status}
- **Start Date**: ${results.start_date.toLocaleDateString()}
- **Total Users**: ${results.total_users}

## Variants Performance

`;

    for (const variant of results.variants) {
      report += `
### ${variant.variant_name}
- **Users**: ${variant.users}
- **Conversions**: ${variant.conversions}
- **Conversion Rate**: ${(variant.conversion_rate * 100).toFixed(2)}%
- **Revenue**: $${variant.revenue.toFixed(2)}
- **ARPU**: $${variant.average_revenue_per_user.toFixed(2)}
- **95% CI**: [${(variant.confidence_interval.lower * 100).toFixed(2)}%, ${(variant.confidence_interval.upper * 100).toFixed(2)}%]

`;
    }

    report += `
## Statistical Significance
- **Is Significant**: ${results.statistical_significance.is_significant ? 'Yes' : 'No'}
- **P-Value**: ${results.statistical_significance.p_value.toFixed(4)}
- **Confidence Level**: ${results.statistical_significance.confidence_level}%
- **Improvement**: ${results.statistical_significance.improvement.toFixed(2)}%
${results.statistical_significance.winning_variant ? `- **Winner**: ${results.statistical_significance.winning_variant}` : ''}

## Metrics Analysis

`;

    for (const metric of results.metrics) {
      report += `
### ${metric.metric_name} (${metric.type})
`;
      for (const variant of metric.variants) {
        const variantName =
          results.variants.find(v => v.variant_id === variant.variant_id)
            ?.variant_name || variant.variant_id;
        report += `- **${variantName}**: ${variant.value.toFixed(2)} (n=${variant.sample_size})
`;
      }
      report += `- **P-Value**: ${metric.statistical_test.p_value.toFixed(4)}
`;
      report += `- **Significant**: ${metric.statistical_test.is_significant ? 'Yes' : 'No'}

`;
    }

    return report;
  }
}

export default ExperimentResultsAnalyzer;
