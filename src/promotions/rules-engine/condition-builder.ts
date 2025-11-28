/**
 * Promotion Condition Builder
 * Purpose: Build complex conditional rules for promotions
 */

import { logger } from '@/lib/logger';

export type Condition = {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains';
  value: any;
};

export type RuleGroup = {
  operator: 'AND' | 'OR';
  conditions: (Condition | RuleGroup)[];
};

export class ConditionBuilder {
  /**
   * Evaluate conditions against context
   */
  evaluate(rule: RuleGroup, context: Record<string, any>): boolean {
    return this.evaluateGroup(rule, context);
  }

  /**
   * Evaluate rule group
   */
  private evaluateGroup(group: RuleGroup, context: Record<string, any>): boolean {
    const results = group.conditions.map(condition => {
      if ('operator' in condition && 'conditions' in condition) {
        return this.evaluateGroup(condition as RuleGroup, context);
      }
      return this.evaluateCondition(condition as Condition, context);
    });

    return group.operator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: Condition, context: Record<string, any>): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case '=':
        return fieldValue === condition.value;
      case '!=':
        return fieldValue !== condition.value;
      case '>':
        return fieldValue > condition.value;
      case '<':
        return fieldValue < condition.value;
      case '>=':
        return fieldValue >= condition.value;
      case '<=':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string, context: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], context);
  }

  /**
   * Build simple condition
   */
  static condition(field: string, operator: Condition['operator'], value: any): Condition {
    return { field, operator, value };
  }

  /**
   * Build AND group
   */
  static and(...conditions: (Condition | RuleGroup)[]): RuleGroup {
    return { operator: 'AND', conditions };
  }

  /**
   * Build OR group
   */
  static or(...conditions: (Condition | RuleGroup)[]): RuleGroup {
    return { operator: 'OR', conditions };
  }
}

export default ConditionBuilder;
