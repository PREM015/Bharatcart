/**
 * Personalization Targeting Engine
 * Purpose: Target content and experiences to user segments
 * Description: Segment matching, rule evaluation, personalization
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: RuleCondition[];
  action: PersonalizationAction;
  enabled: boolean;
  created_at: Date;
}

export interface RuleCondition {
  type: 'user_attribute' | 'behavior' | 'context' | 'segment';
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  value_end?: any; // For 'between' operator
}

export interface PersonalizationAction {
  type: 'show_content' | 'hide_content' | 'redirect' | 'show_banner' | 'modify_price' | 'custom';
  config: Record<string, any>;
}

export interface UserContext {
  user_id?: string;
  session_id: string;
  attributes: Record<string, any>;
  behaviors: UserBehavior[];
  segments: string[];
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device?: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
  };
  page_context?: {
    url: string;
    referrer?: string;
    query_params?: Record<string, string>;
  };
}

export interface UserBehavior {
  event: string;
  timestamp: Date;
  properties?: Record<string, any>;
}

export class PersonalizationTargetingEngine {
  /**
   * Create personalization rule
   */
  async createRule(rule: Omit<PersonalizationRule, 'id' | 'created_at'>): Promise<PersonalizationRule> {
    logger.info('Creating personalization rule', { name: rule.name });

    const created = await prisma.personalizationRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        conditions: JSON.stringify(rule.conditions),
        action: JSON.stringify(rule.action),
        enabled: rule.enabled,
        created_at: new Date(),
      },
    });

    return this.mapToRule(created);
  }

  /**
   * Evaluate rules for user context
   */
  async evaluateRules(context: UserContext): Promise<PersonalizationAction[]> {
    logger.info('Evaluating personalization rules', {
      user_id: context.user_id,
      session_id: context.session_id,
    });

    // Get all enabled rules
    const rules = await this.getEnabledRules();

    // Sort by priority (higher first)
    rules.sort((a, b) => b.priority - a.priority);

    const matchedActions: PersonalizationAction[] = [];

    for (const rule of rules) {
      if (this.evaluateRule(rule, context)) {
        logger.info('Rule matched', { rule_id: rule.id, rule_name: rule.name });
        matchedActions.push(rule.action);

        // Track rule application
        await this.trackRuleApplication(rule.id, context);
      }
    }

    return matchedActions;
  }

  /**
   * Evaluate single rule
   */
  private evaluateRule(rule: PersonalizationRule, context: UserContext): boolean {
    // All conditions must match (AND logic)
    return rule.conditions.every(condition =>
      this.evaluateCondition(condition, context)
    );
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: RuleCondition, context: UserContext): boolean {
    let contextValue: any;

    // Extract value based on condition type
    switch (condition.type) {
      case 'user_attribute':
        contextValue = context.attributes[condition.attribute];
        break;

      case 'segment':
        contextValue = context.segments;
        break;

      case 'behavior':
        // Check if user has performed specific behavior
        contextValue = context.behaviors.some(
          b => b.event === condition.attribute
        );
        break;

      case 'context':
        // Extract from various context objects
        if (condition.attribute.startsWith('location.')) {
          const attr = condition.attribute.split('.')[1];
          contextValue = context.location?.[attr as keyof typeof context.location];
        } else if (condition.attribute.startsWith('device.')) {
          const attr = condition.attribute.split('.')[1];
          contextValue = context.device?.[attr as keyof typeof context.device];
        } else if (condition.attribute.startsWith('page.')) {
          const attr = condition.attribute.split('.')[1];
          contextValue = context.page_context?.[attr as keyof typeof context.page_context];
        }
        break;
    }

    // Evaluate based on operator
    return this.evaluateOperator(condition.operator, contextValue, condition.value, condition.value_end);
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(
    operator: RuleCondition['operator'],
    contextValue: any,
    targetValue: any,
    targetValueEnd?: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === targetValue;

      case 'not_equals':
        return contextValue !== targetValue;

      case 'in':
        if (Array.isArray(contextValue)) {
          return contextValue.some(v => targetValue.includes(v));
        }
        return Array.isArray(targetValue) && targetValue.includes(contextValue);

      case 'not_in':
        if (Array.isArray(contextValue)) {
          return !contextValue.some(v => targetValue.includes(v));
        }
        return !Array.isArray(targetValue) || !targetValue.includes(contextValue);

      case 'greater_than':
        return Number(contextValue) > Number(targetValue);

      case 'less_than':
        return Number(contextValue) < Number(targetValue);

      case 'contains':
        if (typeof contextValue === 'string') {
          return contextValue.includes(targetValue);
        }
        if (Array.isArray(contextValue)) {
          return contextValue.includes(targetValue);
        }
        return false;

      case 'between':
        const numValue = Number(contextValue);
        return numValue >= Number(targetValue) && numValue <= Number(targetValueEnd);

      default:
        return false;
    }
  }

  /**
   * Get enabled rules
   */
  private async getEnabledRules(): Promise<PersonalizationRule[]> {
    const rules = await prisma.personalizationRule.findMany({
      where: { enabled: true },
    });

    return rules.map(r => this.mapToRule(r));
  }

  /**
   * Track rule application
   */
  private async trackRuleApplication(
    ruleId: string,
    context: UserContext
  ): Promise<void> {
    await prisma.personalizationApplication.create({
      data: {
        rule_id: ruleId,
        user_id: context.user_id,
        session_id: context.session_id,
        context: JSON.stringify(context),
        applied_at: new Date(),
      },
    });
  }

  /**
   * Get rule performance
   */
  async getRulePerformance(ruleId: string): Promise<{
    applications: number;
    conversions: number;
    conversion_rate: number;
  }> {
    const applications = await prisma.personalizationApplication.count({
      where: { rule_id: ruleId },
    });

    // Count conversions (users who completed goal after seeing personalization)
    const conversions = 0; // Implement based on your conversion tracking

    return {
      applications,
      conversions,
      conversion_rate: applications > 0 ? conversions / applications : 0,
    };
  }

  /**
   * Map database record to PersonalizationRule
   */
  private mapToRule(record: any): PersonalizationRule {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      priority: record.priority,
      conditions: JSON.parse(record.conditions),
      action: JSON.parse(record.action),
      enabled: record.enabled,
      created_at: record.created_at,
    };
  }

  /**
   * Create common targeting rules
   */
  static createCommonRules() {
    return {
      /**
       * First-time visitors
       */
      firstTimeVisitors(action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: 'First Time Visitors',
          description: 'Target users on their first visit',
          priority: 100,
          conditions: [
            {
              type: 'user_attribute',
              attribute: 'visit_count',
              operator: 'equals',
              value: 1,
            },
          ],
          action,
          enabled: true,
        };
      },

      /**
       * Returning customers
       */
      returningCustomers(action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: 'Returning Customers',
          description: 'Target users who have made a purchase',
          priority: 90,
          conditions: [
            {
              type: 'user_attribute',
              attribute: 'purchase_count',
              operator: 'greater_than',
              value: 0,
            },
          ],
          action,
          enabled: true,
        };
      },

      /**
       * High-value customers
       */
      highValueCustomers(threshold: number, action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: 'High Value Customers',
          description: `Target customers with lifetime value > $${threshold}`,
          priority: 95,
          conditions: [
            {
              type: 'user_attribute',
              attribute: 'lifetime_value',
              operator: 'greater_than',
              value: threshold,
            },
          ],
          action,
          enabled: true,
        };
      },

      /**
       * Cart abandoners
       */
      cartAbandoners(action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: 'Cart Abandoners',
          description: 'Target users who added items to cart but didn't purchase',
          priority: 85,
          conditions: [
            {
              type: 'behavior',
              attribute: 'add_to_cart',
              operator: 'equals',
              value: true,
            },
            {
              type: 'behavior',
              attribute: 'purchase',
              operator: 'equals',
              value: false,
            },
          ],
          action,
          enabled: true,
        };
      },

      /**
       * Mobile users
       */
      mobileUsers(action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: 'Mobile Users',
          description: 'Target users on mobile devices',
          priority: 80,
          conditions: [
            {
              type: 'context',
              attribute: 'device.type',
              operator: 'equals',
              value: 'mobile',
            },
          ],
          action,
          enabled: true,
        };
      },

      /**
       * Geographic targeting
       */
      geographic(country: string, action: PersonalizationAction): Omit<PersonalizationRule, 'id' | 'created_at'> {
        return {
          name: `Users in ${country}`,
          description: `Target users from ${country}`,
          priority: 75,
          conditions: [
            {
              type: 'context',
              attribute: 'location.country',
              operator: 'equals',
              value: country,
            },
          ],
          action,
          enabled: true,
        };
      },
    };
  }
}

export default PersonalizationTargetingEngine;
