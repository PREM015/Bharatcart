/**
 * Commission Rules Engine
 * Purpose: Manage flexible commission structures
 * Description: Tiered commissions, category-based rates, promotional rates
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface CommissionRule {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered' | 'hybrid';
  priority: number;
  conditions: {
    vendor_tier?: string[];
    category_ids?: number[];
    min_order_value?: number;
    max_order_value?: number;
    product_ids?: number[];
  };
  rates: {
    percentage?: number;
    fixed_amount?: number;
    tiers?: Array<{
      min_amount: number;
      max_amount?: number;
      rate: number;
    }>;
  };
  valid_from: Date;
  valid_until?: Date;
  is_active: boolean;
}

export class CommissionRulesEngine {
  /**
   * Create commission rule
   */
  async createRule(rule: Omit<CommissionRule, 'id'>): Promise<CommissionRule> {
    logger.info('Creating commission rule', { name: rule.name });

    const created = await prisma.commissionRule.create({
      data: {
        name: rule.name,
        type: rule.type,
        priority: rule.priority,
        conditions: JSON.stringify(rule.conditions),
        rates: JSON.stringify(rule.rates),
        valid_from: rule.valid_from,
        valid_until: rule.valid_until,
        is_active: rule.is_active,
      },
    });

    logger.info('Commission rule created', { rule_id: created.id });

    return {
      id: created.id,
      ...rule,
    };
  }

  /**
   * Get applicable commission rate for order
   */
  async getCommissionRate(
    vendorId: number,
    orderAmount: number,
    categoryId?: number,
    productId?: number
  ): Promise<{
    rate: number;
    type: string;
    rule_id: number;
    breakdown?: any;
  }> {
    logger.info('Calculating commission rate', {
      vendor_id: vendorId,
      order_amount: orderAmount,
    });

    // Get vendor details
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { scorecard: true },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Get all applicable rules
    const rules = await prisma.commissionRule.findMany({
      where: {
        is_active: true,
        valid_from: { lte: new Date() },
        OR: [{ valid_until: null }, { valid_until: { gte: new Date() } }],
      },
      orderBy: { priority: 'desc' }, // Higher priority first
    });

    // Find matching rule
    for (const rule of rules) {
      const conditions = JSON.parse(rule.conditions);
      const rates = JSON.parse(rule.rates);

      // Check conditions
      if (!this.matchesConditions(conditions, vendor, orderAmount, categoryId, productId)) {
        continue;
      }

      // Calculate rate based on rule type
      let finalRate: number;
      let breakdown: any = null;

      switch (rule.type) {
        case 'percentage':
          finalRate = rates.percentage || 15; // Default 15%
          break;

        case 'fixed':
          finalRate = ((rates.fixed_amount || 0) / orderAmount) * 100;
          break;

        case 'tiered':
          const tier = rates.tiers?.find(
            (t: any) =>
              orderAmount >= t.min_amount &&
              (!t.max_amount || orderAmount <= t.max_amount)
          );
          finalRate = tier?.rate || 15;
          breakdown = { tier };
          break;

        case 'hybrid':
          finalRate = rates.percentage || 15;
          const fixedFee = rates.fixed_amount || 0;
          breakdown = {
            percentage: finalRate,
            fixed_fee: fixedFee,
            total: (orderAmount * finalRate) / 100 + fixedFee,
          };
          break;

        default:
          finalRate = 15;
      }

      return {
        rate: finalRate,
        type: rule.type,
        rule_id: rule.id,
        breakdown,
      };
    }

    // Default commission rate
    return {
      rate: 15,
      type: 'percentage',
      rule_id: 0,
    };
  }

  /**
   * Check if conditions match
   */
  private matchesConditions(
    conditions: any,
    vendor: any,
    orderAmount: number,
    categoryId?: number,
    productId?: number
  ): boolean {
    // Check vendor tier
    if (conditions.vendor_tier && conditions.vendor_tier.length > 0) {
      const vendorTier = vendor.scorecard?.tier || 'starter';
      if (!conditions.vendor_tier.includes(vendorTier)) {
        return false;
      }
    }

    // Check category
    if (conditions.category_ids && conditions.category_ids.length > 0) {
      if (!categoryId || !conditions.category_ids.includes(categoryId)) {
        return false;
      }
    }

    // Check product
    if (conditions.product_ids && conditions.product_ids.length > 0) {
      if (!productId || !conditions.product_ids.includes(productId)) {
        return false;
      }
    }

    // Check order value range
    if (conditions.min_order_value && orderAmount < conditions.min_order_value) {
      return false;
    }

    if (conditions.max_order_value && orderAmount > conditions.max_order_value) {
      return false;
    }

    return true;
  }

  /**
   * Create promotional commission rate
   */
  async createPromotionalRate(
    name: string,
    vendorIds: number[],
    discountPercentage: number,
    validFrom: Date,
    validUntil: Date
  ): Promise<void> {
    logger.info('Creating promotional commission rate', {
      name,
      discount: discountPercentage,
    });

    for (const vendorId of vendorIds) {
      await prisma.promotionalCommission.create({
        data: {
          vendor_id: vendorId,
          name,
          discount_percentage: discountPercentage,
          valid_from: validFrom,
          valid_until: validUntil,
          is_active: true,
        },
      });
    }

    logger.info('Promotional rate created for vendors', {
      count: vendorIds.length,
    });
  }

  /**
   * Get commission summary for period
   */
  async getCommissionSummary(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_sales: number;
    total_commission: number;
    average_rate: number;
    breakdown_by_rule: Array<{
      rule_name: string;
      sales: number;
      commission: number;
      rate: number;
    }>;
  }> {
    const orders = await prisma.order.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      include: {
        commission_detail: true,
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalCommission = orders.reduce(
      (sum, order) => sum + (order.commission_detail?.amount || 0),
      0
    );

    const averageRate = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0;

    // Group by rule
    const breakdownMap = new Map<number, any>();

    orders.forEach(order => {
      const ruleId = order.commission_detail?.rule_id || 0;
      const ruleName = order.commission_detail?.rule_name || 'Default';

      if (!breakdownMap.has(ruleId)) {
        breakdownMap.set(ruleId, {
          rule_name: ruleName,
          sales: 0,
          commission: 0,
          count: 0,
        });
      }

      const entry = breakdownMap.get(ruleId)!;
      entry.sales += order.total;
      entry.commission += order.commission_detail?.amount || 0;
      entry.count += 1;
    });

    const breakdownByRule = Array.from(breakdownMap.values()).map(entry => ({
      rule_name: entry.rule_name,
      sales: entry.sales / 100,
      commission: entry.commission / 100,
      rate: entry.sales > 0 ? (entry.commission / entry.sales) * 100 : 0,
    }));

    return {
      total_sales: totalSales / 100,
      total_commission: totalCommission / 100,
      average_rate: averageRate,
      breakdown_by_rule: breakdownByRule,
    };
  }
}

export default CommissionRulesEngine;
