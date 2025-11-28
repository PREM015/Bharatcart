/**
 * Fraud Detection Rules Engine
 * Purpose: Rule-based fraud detection
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface FraudRule {
  id: string;
  name: string;
  condition: (transaction: any) => boolean;
  action: 'block' | 'review' | 'flag';
  weight: number;
}

export class FraudRulesEngine {
  private rules: FraudRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // High-value transaction
    this.addRule({
      id: 'high_value',
      name: 'High Value Transaction',
      condition: (tx) => tx.amount > 100000, // $1000
      action: 'review',
      weight: 20,
    });

    // Multiple failed attempts
    this.addRule({
      id: 'multiple_failures',
      name: 'Multiple Failed Attempts',
      condition: (tx) => tx.failedAttempts >= 3,
      action: 'block',
      weight: 50,
    });

    // Unusual location
    this.addRule({
      id: 'unusual_location',
      name: 'Unusual Location',
      condition: (tx) => tx.ipCountry !== tx.billingCountry,
      action: 'review',
      weight: 30,
    });

    // High velocity
    this.addRule({
      id: 'high_velocity',
      name: 'High Transaction Velocity',
      condition: (tx) => tx.recentTransactionCount > 5,
      action: 'review',
      weight: 40,
    });
  }

  addRule(rule: FraudRule): void {
    this.rules.push(rule);
  }

  async evaluate(transaction: any): Promise<{
    riskScore: number;
    action: 'approve' | 'review' | 'block';
    triggeredRules: string[];
  }> {
    logger.info('Evaluating transaction for fraud', {
      transactionId: transaction.id,
    });

    const triggeredRules: string[] = [];
    let totalWeight = 0;

    for (const rule of this.rules) {
      if (rule.condition(transaction)) {
        triggeredRules.push(rule.name);
        totalWeight += rule.weight;
      }
    }

    const riskScore = Math.min(100, totalWeight);

    let action: 'approve' | 'review' | 'block' = 'approve';
    if (riskScore >= 70) {
      action = 'block';
    } else if (riskScore >= 40) {
      action = 'review';
    }

    // Log fraud check
    await prisma.fraudCheck.create({
      data: {
        transaction_id: transaction.id,
        risk_score: riskScore,
        action,
        triggered_rules: JSON.stringify(triggeredRules),
        checked_at: new Date(),
      },
    });

    return { riskScore, action, triggeredRules };
  }
}

export default FraudRulesEngine;
