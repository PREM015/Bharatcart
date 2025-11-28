/**
 * Variant Assignment Engine
 * Purpose: Assign users to experiment variants
 * Description: Consistent hashing, traffic allocation, bucketing
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { ExperimentConfig, ExperimentVariant, TargetingRule } from './experiment-config';

export interface VariantAssignment {
  experiment_id: string;
  user_id: string;
  variant_id: string;
  variant_name: string;
  assigned_at: Date;
  session_id?: string;
}

export class VariantAssignmentEngine {
  /**
   * Assign user to variant
   */
  async assignVariant(
    experimentId: string,
    userId: string,
    userAttributes?: Record<string, any>,
    sessionId?: string
  ): Promise<VariantAssignment> {
    logger.info('Assigning variant', {
      experiment_id: experimentId,
      user_id: userId,
    });

    // Check if user already assigned
    const existing = await this.getExistingAssignment(experimentId, userId);
    if (existing) {
      logger.info('Returning existing assignment', {
        variant_id: existing.variant_id,
      });
      return existing;
    }

    // Get experiment config
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.status !== 'running') {
      throw new Error('Experiment is not running');
    }

    const config: ExperimentConfig = {
      ...experiment,
      variants: JSON.parse(experiment.variants),
      targeting_rules: experiment.targeting_rules
        ? JSON.parse(experiment.targeting_rules)
        : undefined,
      metrics: JSON.parse(experiment.metrics),
    };

    // Check targeting rules
    if (config.targeting_rules && userAttributes) {
      const isEligible = this.evaluateTargetingRules(
        config.targeting_rules,
        userAttributes
      );

      if (!isEligible) {
        logger.info('User not eligible for experiment', {
          user_id: userId,
          experiment_id: experimentId,
        });
        throw new Error('User not eligible for experiment');
      }
    }

    // Assign variant using consistent hashing
    const variant = this.selectVariant(experimentId, userId, config.variants);

    // Save assignment
    const assignment = await prisma.experimentAssignment.create({
      data: {
        experiment_id: experimentId,
        user_id: userId,
        variant_id: variant.id,
        variant_name: variant.name,
        session_id: sessionId,
        assigned_at: new Date(),
      },
    });

    // Track assignment event
    await this.trackAssignmentEvent(experimentId, userId, variant.id);

    return {
      experiment_id: experimentId,
      user_id: userId,
      variant_id: variant.id,
      variant_name: variant.name,
      assigned_at: assignment.assigned_at,
      session_id: sessionId,
    };
  }

  /**
   * Get existing assignment
   */
  private async getExistingAssignment(
    experimentId: string,
    userId: string
  ): Promise<VariantAssignment | null> {
    const assignment = await prisma.experimentAssignment.findFirst({
      where: {
        experiment_id: experimentId,
        user_id: userId,
      },
    });

    if (!assignment) {
      return null;
    }

    return {
      experiment_id: assignment.experiment_id,
      user_id: assignment.user_id,
      variant_id: assignment.variant_id,
      variant_name: assignment.variant_name,
      assigned_at: assignment.assigned_at,
      session_id: assignment.session_id || undefined,
    };
  }

  /**
   * Select variant using consistent hashing
   */
  private selectVariant(
    experimentId: string,
    userId: string,
    variants: ExperimentVariant[]
  ): ExperimentVariant {
    // Create hash of experiment + user for consistent assignment
    const hash = createHash('md5')
      .update(`${experimentId}:${userId}`)
      .digest('hex');

    // Convert hash to number between 0-100
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const bucket = (hashValue % 10000) / 100; // 0-100 with 2 decimal precision

    // Find variant based on traffic allocation
    let cumulativeAllocation = 0;
    for (const variant of variants) {
      cumulativeAllocation += variant.traffic_allocation;
      if (bucket < cumulativeAllocation) {
        return variant;
      }
    }

    // Fallback to control variant
    return variants.find(v => v.is_control) || variants[0];
  }

  /**
   * Evaluate targeting rules
   */
  private evaluateTargetingRules(
    rules: TargetingRule[],
    userAttributes: Record<string, any>
  ): boolean {
    // All rules must pass (AND logic)
    return rules.every(rule => this.evaluateRule(rule, userAttributes));
  }

  /**
   * Evaluate single targeting rule
   */
  private evaluateRule(
    rule: TargetingRule,
    userAttributes: Record<string, any>
  ): boolean {
    const attributeValue = userAttributes[rule.attribute];

    switch (rule.operator) {
      case 'equals':
        return attributeValue === rule.value;

      case 'not_equals':
        return attributeValue !== rule.value;

      case 'contains':
        if (typeof attributeValue === 'string') {
          return attributeValue.includes(rule.value);
        }
        if (Array.isArray(attributeValue)) {
          return attributeValue.includes(rule.value);
        }
        return false;

      case 'greater_than':
        return Number(attributeValue) > Number(rule.value);

      case 'less_than':
        return Number(attributeValue) < Number(rule.value);

      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(attributeValue);

      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(attributeValue);

      default:
        logger.warn('Unknown operator', { operator: rule.operator });
        return false;
    }
  }

  /**
   * Track assignment event
   */
  private async trackAssignmentEvent(
    experimentId: string,
    userId: string,
    variantId: string
  ): Promise<void> {
    await prisma.analyticsEvent.create({
      data: {
        event_type: 'experiment_assignment',
        user_id: userId,
        properties: JSON.stringify({
          experiment_id: experimentId,
          variant_id: variantId,
        }),
        created_at: new Date(),
      },
    });
  }

  /**
   * Get all assignments for user
   */
  async getUserAssignments(userId: string): Promise<VariantAssignment[]> {
    const assignments = await prisma.experimentAssignment.findMany({
      where: { user_id: userId },
      include: {
        experiment: true,
      },
    });

    return assignments.map(a => ({
      experiment_id: a.experiment_id,
      user_id: a.user_id,
      variant_id: a.variant_id,
      variant_name: a.variant_name,
      assigned_at: a.assigned_at,
      session_id: a.session_id || undefined,
    }));
  }

  /**
   * Get all assignments for experiment
   */
  async getExperimentAssignments(
    experimentId: string
  ): Promise<{ variant_id: string; count: number }[]> {
    const assignments = await prisma.experimentAssignment.groupBy({
      by: ['variant_id'],
      where: { experiment_id: experimentId },
      _count: true,
    });

    return assignments.map(a => ({
      variant_id: a.variant_id,
      count: a._count,
    }));
  }

  /**
   * Force assign variant (for testing)
   */
  async forceAssignVariant(
    experimentId: string,
    userId: string,
    variantId: string
  ): Promise<VariantAssignment> {
    logger.info('Force assigning variant', {
      experiment_id: experimentId,
      user_id: userId,
      variant_id: variantId,
    });

    // Delete existing assignment
    await prisma.experimentAssignment.deleteMany({
      where: {
        experiment_id: experimentId,
        user_id: userId,
      },
    });

    // Get experiment
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const variants: ExperimentVariant[] = JSON.parse(experiment.variants);
    const variant = variants.find(v => v.id === variantId);

    if (!variant) {
      throw new Error('Variant not found');
    }

    // Create assignment
    const assignment = await prisma.experimentAssignment.create({
      data: {
        experiment_id: experimentId,
        user_id: userId,
        variant_id: variant.id,
        variant_name: variant.name,
        assigned_at: new Date(),
      },
    });

    return {
      experiment_id: experimentId,
      user_id: userId,
      variant_id: variant.id,
      variant_name: variant.name,
      assigned_at: assignment.assigned_at,
    };
  }

  /**
   * Remove user from experiment
   */
  async removeUserFromExperiment(
    experimentId: string,
    userId: string
  ): Promise<void> {
    logger.info('Removing user from experiment', {
      experiment_id: experimentId,
      user_id: userId,
    });

    await prisma.experimentAssignment.deleteMany({
      where: {
        experiment_id: experimentId,
        user_id: userId,
      },
    });
  }
}

export default VariantAssignmentEngine;
