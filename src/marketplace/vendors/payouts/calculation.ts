/**
 * Vendor Payout Calculation
 * Purpose: Calculate vendor earnings and payouts
 * Description: Commission deduction, fee calculation, earnings aggregation
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface PayoutCalculation {
  vendor_id: number;
  period: {
    start: Date;
    end: Date;
  };
  gross_sales: number;
  deductions: {
    commission: number;
    transaction_fees: number;
    refunds: number;
    chargebacks: number;
    penalties: number;
  };
  net_earnings: number;
  breakdown: {
    total_orders: number;
    completed_orders: number;
    average_commission_rate: number;
  };
}

export class PayoutCalculation {
  /**
   * Calculate vendor payout
   */
  async calculatePayout(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PayoutCalculation> {
    logger.info('Calculating payout', {
      vendor_id: vendorId,
      period: { start: startDate, end: endDate },
    });

    // Get vendor's commission rate
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { agreement: true },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const commissionRate = vendor.agreement?.commission_rate || 15; // Default 15%

    // Get all orders in period
    const orders = await prisma.order.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      include: {
        items: true,
        refunds: true,
      },
    });

    // Calculate gross sales
    const grossSales = orders.reduce((sum, order) => sum + order.total, 0);

    // Calculate commission
    const commission = (grossSales * commissionRate) / 100;

    // Calculate transaction fees (2.9% + $0.30 per transaction)
    const transactionFees = orders.reduce((sum, order) => {
      const percentageFee = (order.total * 2.9) / 100;
      const fixedFee = 30; // $0.30 in cents
      return sum + percentageFee + fixedFee;
    }, 0);

    // Calculate refunds
    const refunds = orders.reduce((sum, order) => {
      if (order.refunds && order.refunds.length > 0) {
        return (
          sum +
          order.refunds.reduce((refundSum, refund) => refundSum + refund.amount, 0)
        );
      }
      return sum;
    }, 0);

    // Calculate chargebacks
    const chargebacks = await this.calculateChargebacks(vendorId, startDate, endDate);

    // Calculate penalties
    const penalties = await this.calculatePenalties(vendorId, startDate, endDate);

    // Calculate net earnings
    const totalDeductions =
      commission + transactionFees + refunds + chargebacks + penalties;
    const netEarnings = grossSales - totalDeductions;

    const calculation: PayoutCalculation = {
      vendor_id: vendorId,
      period: { start: startDate, end: endDate },
      gross_sales: grossSales / 100, // Convert from cents
      deductions: {
        commission: commission / 100,
        transaction_fees: transactionFees / 100,
        refunds: refunds / 100,
        chargebacks: chargebacks / 100,
        penalties: penalties / 100,
      },
      net_earnings: netEarnings / 100,
      breakdown: {
        total_orders: orders.length,
        completed_orders: orders.filter(o => o.status === 'COMPLETED').length,
        average_commission_rate: commissionRate,
      },
    };

    // Save calculation
    await this.saveCalculation(calculation);

    logger.info('Payout calculated', {
      vendor_id: vendorId,
      net_earnings: calculation.net_earnings,
    });

    return calculation;
  }

  /**
   * Calculate chargebacks
   */
  private async calculateChargebacks(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const chargebacks = await prisma.chargeback.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: 'LOST',
      },
    });

    return chargebacks.reduce((sum, cb) => sum + cb.amount, 0);
  }

  /**
   * Calculate penalties
   */
  private async calculatePenalties(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const penalties = await prisma.vendorPenalty.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: 'ACTIVE',
      },
    });

    return penalties.reduce((sum, penalty) => sum + penalty.amount, 0);
  }

  /**
   * Save calculation
   */
  private async saveCalculation(calculation: PayoutCalculation): Promise<void> {
    await prisma.payoutCalculation.create({
      data: {
        vendor_id: calculation.vendor_id,
        period_start: calculation.period.start,
        period_end: calculation.period.end,
        gross_sales: Math.round(calculation.gross_sales * 100),
        commission: Math.round(calculation.deductions.commission * 100),
        transaction_fees: Math.round(calculation.deductions.transaction_fees * 100),
        refunds: Math.round(calculation.deductions.refunds * 100),
        chargebacks: Math.round(calculation.deductions.chargebacks * 100),
        penalties: Math.round(calculation.deductions.penalties * 100),
        net_earnings: Math.round(calculation.net_earnings * 100),
        total_orders: calculation.breakdown.total_orders,
        calculated_at: new Date(),
      },
    });
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(
    vendorId: number,
    limit: number = 12
  ): Promise<PayoutCalculation[]> {
    const calculations = await prisma.payoutCalculation.findMany({
      where: { vendor_id: vendorId },
      orderBy: { calculated_at: 'desc' },
      take: limit,
    });

    return calculations.map(calc => ({
      vendor_id: calc.vendor_id,
      period: {
        start: calc.period_start,
        end: calc.period_end,
      },
      gross_sales: calc.gross_sales / 100,
      deductions: {
        commission: calc.commission / 100,
        transaction_fees: calc.transaction_fees / 100,
        refunds: calc.refunds / 100,
        chargebacks: calc.chargebacks / 100,
        penalties: calc.penalties / 100,
      },
      net_earnings: calc.net_earnings / 100,
      breakdown: {
        total_orders: calc.total_orders,
        completed_orders: calc.total_orders,
        average_commission_rate: 15,
      },
    }));
  }

  /**
   * Get pending payout amount
   */
  async getPendingPayout(vendorId: number): Promise<number> {
    const lastPayout = await prisma.vendorPayout.findFirst({
      where: { vendor_id: vendorId },
      orderBy: { created_at: 'desc' },
    });

    const startDate = lastPayout
      ? new Date(lastPayout.period_end)
      : new Date(0);
    const endDate = new Date();

    const calculation = await this.calculatePayout(vendorId, startDate, endDate);

    return calculation.net_earnings;
  }
}

export default PayoutCalculation;
