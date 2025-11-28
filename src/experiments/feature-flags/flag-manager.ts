/**
 * Feature Flag Manager
 * Purpose: Manage feature flags and their state
 * Description: Flag creation, evaluation, override management
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string;
  enabled: boolean;
  type: 'boolean' | 'string' | 'number' | 'json';
  default_value: any;
  targeting_rules?: FlagTargetingRule[];
  rollout_percentage?: number;
  created_at: Date;
  updated_at: Date;
}

export interface FlagTargetingRule {
  id: string;
  name: string;
  conditions: FlagCondition[];
  value: any;
  rollout_percentage?: number;
}

export interface FlagCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: any;
}

export interface FlagEvaluationContext {
  user_id?: string;
  email?: string;
  segment?: string;
  custom_attributes?: Record<string, any>;
}

export class FeatureFlagManager extends EventEmitter {
  private flagCache: Map<string, FeatureFlag> = new Map();
  private cacheExpiry: number = 60000; // 1 minute
  private lastCacheUpdate: number = 0;

  constructor() {
    super();
    this.loadFlags();
  }

  /**
   * Create new feature flag
   */
  async createFlag(data: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag> {
    logger.info('Creating feature flag', { key: data.key });

    const flag = await prisma.featureFlag.create({
      data: {
        name: data.name,
        description: data.description,
        key: data.key,
        enabled: data.enabled,
        type: data.type,
        default_value: JSON.stringify(data.default_value),
        targeting_rules: data.targeting_rules ? JSON.stringify(data.targeting_rules) : null,
        rollout_percentage: data.rollout_percentage,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const featureFlag = this.mapToFeatureFlag(flag);
    this.flagCache.set(flag.key, featureFlag);
    this.emit('flag_created', featureFlag);

    return featureFlag;
  }

  /**
   * Update feature flag
   */
  async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    logger.info('Updating feature flag', { key });

    const flag = await prisma.featureFlag.update({
      where: { key },
      data: {
        name: updates.name,
        description: updates.description,
        enabled: updates.enabled,
        type: updates.type,
        default_value: updates.default_value !== undefined ? JSON.stringify(updates.default_value) : undefined,
        targeting_rules: updates.targeting_rules ? JSON.stringify(updates.targeting_rules) : undefined,
        rollout_percentage: updates.rollout_percentage,
        updated_at: new Date(),
      },
    });

    const featureFlag = this.mapToFeatureFlag(flag);
    this.flagCache.set(flag.key, featureFlag);
    this.emit('flag_updated', featureFlag);

    return featureFlag;
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    logger.info('Deleting feature flag', { key });

    await prisma.featureFlag.delete({
      where: { key },
    });

    this.flagCache.delete(key);
    this.emit('flag_deleted', { key });
  }

  /**
   * Get flag by key
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    // Check cache first
    if (this.flagCache.has(key) && Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
      return this.flagCache.get(key)!;
    }

    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      return null;
    }

    const featureFlag = this.mapToFeatureFlag(flag);
    this.flagCache.set(key, featureFlag);

    return featureFlag;
  }

  /**
   * Get all flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { created_at: 'desc' },
    });

    return flags.map(f => this.mapToFeatureFlag(f));
  }

  /**
   * Evaluate flag for context
   */
  async evaluateFlag(key: string, context: FlagEvaluationContext): Promise<any> {
    const flag = await this.getFlag(key);

    if (!flag) {
      logger.warn('Feature flag not found', { key });
      return null;
    }

    if (!flag.enabled) {
      return flag.default_value;
    }

    // Evaluate targeting rules
    if (flag.targeting_rules && flag.targeting_rules.length > 0) {
      for (const rule of flag.targeting_rules) {
        if (this.evaluateRule(rule, context)) {
          // Check rollout percentage for this rule
          if (rule.rollout_percentage !== undefined) {
            if (this.isInRollout(context.user_id || '', rule.rollout_percentage)) {
              return rule.value;
            }
          } else {
            return rule.value;
          }
        }
      }
    }

    // Check global rollout percentage
    if (flag.rollout_percentage !== undefined) {
      if (this.isInRollout(context.user_id || '', flag.rollout_percentage)) {
        return flag.default_value;
      }
      return this.getDisabledValue(flag.type);
    }

    return flag.default_value;
  }

  /**
   * Evaluate targeting rule
   */
  private evaluateRule(rule: FlagTargetingRule, context: FlagEvaluationContext): boolean {
    // All conditions must match (AND logic)
    return rule.conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: FlagCondition, context: FlagEvaluationContext): boolean {
    const contextValue = this.getContextValue(condition.attribute, context);

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;

      case 'not_equals':
        return contextValue !== condition.value;

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);

      case 'greater_than':
        return Number(contextValue) > Number(condition.value);

      case 'less_than':
        return Number(contextValue) < Number(condition.value);

      case 'contains':
        return String(contextValue).includes(String(condition.value));

      case 'matches':
        const regex = new RegExp(condition.value);
        return regex.test(String(contextValue));

      default:
        return false;
    }
  }

  /**
   * Get value from context
   */
  private getContextValue(attribute: string, context: FlagEvaluationContext): any {
    if (attribute === 'user_id') return context.user_id;
    if (attribute === 'email') return context.email;
    if (attribute === 'segment') return context.segment;
    return context.custom_attributes?.[attribute];
  }

  /**
   * Check if user is in rollout percentage
   */
  private isInRollout(userId: string, percentage: number): boolean {
    // Use consistent hashing
    const hash = this.hashString(userId);
    const bucket = (hash % 100) + 1;
    return bucket <= percentage;
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get disabled value based on type
   */
  private getDisabledValue(type: string): any {
    switch (type) {
      case 'boolean':
        return false;
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'json':
        return {};
      default:
        return null;
    }
  }

  /**
   * Load all flags into cache
   */
  private async loadFlags(): Promise<void> {
    try {
      const flags = await prisma.featureFlag.findMany();
      flags.forEach(flag => {
        this.flagCache.set(flag.key, this.mapToFeatureFlag(flag));
      });
      this.lastCacheUpdate = Date.now();
      logger.info('Feature flags loaded into cache', { count: flags.length });
    } catch (error) {
      logger.error('Failed to load feature flags', { error });
    }
  }

  /**
   * Refresh cache
   */
  async refreshCache(): Promise<void> {
    logger.info('Refreshing feature flag cache');
    await this.loadFlags();
  }

  /**
   * Map database record to FeatureFlag
   */
  private mapToFeatureFlag(flag: any): FeatureFlag {
    return {
      id: flag.id,
      name: flag.name,
      description: flag.description,
      key: flag.key,
      enabled: flag.enabled,
      type: flag.type,
      default_value: JSON.parse(flag.default_value),
      targeting_rules: flag.targeting_rules ? JSON.parse(flag.targeting_rules) : undefined,
      rollout_percentage: flag.rollout_percentage,
      created_at: flag.created_at,
      updated_at: flag.updated_at,
    };
  }

  /**
   * Enable flag
   */
  async enableFlag(key: string): Promise<void> {
    await this.updateFlag(key, { enabled: true });
  }

  /**
   * Disable flag
   */
  async disableFlag(key: string): Promise<void> {
    await this.updateFlag(key, { enabled: false });
  }

  /**
   * Set rollout percentage
   */
  async setRolloutPercentage(key: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    await this.updateFlag(key, { rollout_percentage: percentage });
  }
}

export default FeatureFlagManager;
