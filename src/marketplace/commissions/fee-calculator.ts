/**
 * Fee Calculator
 * Purpose: Calculate all applicable fees for transactions
 * Description: Commission, payment processing, listing fees
 */

import { logger } from '@/lib/logger';
import { CommissionRulesEngine } from './commission-rules';

export interface FeeBreakdown {
  order_amount: number;
  fees: {
    commission: {
      amount: number;
      rate: number;
      rule_id: number;
    };
    payment_processing: {
      amount: number;
      rate: number;
    };
    listing_fee?: {
      amount: number;
      type: string;
    };
    transaction_fee?: {
      amount: number;
    };
  };
  total_fees: number;
  vendor_earnings: number;
}

export class FeeCalculator {
  private commissionEngine: CommissionRulesEngine;

  constructor() {
    this.commissionEngine = new CommissionRulesEngine();
  }

  /**
   * Calculate all fees for order
   */
  async calculateFees(
    vendorId: number,
    orderAmount: number,
    categoryId?: number,
    productId?: number
  ): Promise<FeeBreakdown> {
    logger.info('Calculating fees', {
      vendor_id: vendorId,
      order_amount: orderAmount,
    });

    // Get commission rate
    const commissionInfo = await this.commissionEngine.getCommissionRate(
      vendorId,
      orderAmount,
      categoryId,
      productId
    );

    const commissionAmount = (orderAmount * commissionInfo.rate) / 100;

    // Calculate payment processing fee (Stripe-like: 2.9% + $0.30)
    const paymentProcessingRate = 2.9;
    const paymentProcessingFixed = 0.3;
    const paymentProcessingAmount =
      (orderAmount * paymentProcessingRate) / 100 + paymentProcessingFixed;

    // Calculate transaction fee (flat fee per transaction)
    const transactionFee = 0.5; // $0.50 per transaction

    const totalFees = commissionAmount + paymentProcessingAmount + transactionFee;
    const vendorEarnings = orderAmount - totalFees;

    const breakdown: FeeBreakdown = {
      order_amount: orderAmount,
      fees: {
        commission: {
          amount: commissionAmount,
          rate: commissionInfo.rate,
          rule_id: commissionInfo.rule_id,
        },
        payment_processing: {
          amount: paymentProcessingAmount,
          rate: paymentProcessingRate,
        },
        transaction_fee: {
          amount: transactionFee,
        },
      },
      total_fees: totalFees,
      vendor_earnings: vendorEarnings,
    };

    return breakdown;
  }

  /**
   * Calculate listing fee
   */
  calculateListingFee(
    listingType: 'basic' | 'featured' | 'premium',
    duration: number
  ): number {
    const fees = {
      basic: 0, // Free
      featured: 10, // $10 per month
      premium: 25, // $25 per month
    };

    const monthlyFee = fees[listingType];
    return (monthlyFee * duration) / 30; // Daily rate
  }

  /**
   * Estimate monthly fees for vendor
   */
  async estimateMonthlyFees(
    vendorId: number,
    estimatedSales: number,
    estimatedOrders: number
  ): Promise<{
    commission: number;
    payment_processing: number;
    transaction_fees: number;
    total: number;
  }> {
    const avgOrderValue = estimatedSales / estimatedOrders;

    // Get average commission rate
    const commissionInfo = await this.commissionEngine.getCommissionRate(
      vendorId,
      avgOrderValue
    );

    const commission = (estimatedSales * commissionInfo.rate) / 100;
    const paymentProcessing =
      (estimatedSales * 2.9) / 100 + estimatedOrders * 0.3;
    const transactionFees = estimatedOrders * 0.5;

    return {
      commission,
      payment_processing: paymentProcessing,
      transaction_fees: transactionFees,
      total: commission + paymentProcessing + transactionFees,
    };
  }
}

export default FeeCalculator;
