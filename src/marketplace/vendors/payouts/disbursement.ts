/**
 * Vendor Payout Disbursement
 * Purpose: Process and disburse vendor payouts
 * Description: Bank transfers, payment processing, payout scheduling
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface PayoutRequest {
  vendor_id: number;
  amount: number;
  currency: string;
  payment_method: 'bank_transfer' | 'stripe_connect' | 'paypal';
  bank_account?: {
    account_holder_name: string;
    account_number: string;
    routing_number: string;
    bank_name: string;
  };
}

export interface PayoutResult {
  payout_id: string;
  status: 'processing' | 'completed' | 'failed';
  transaction_id?: string;
  estimated_arrival?: Date;
}

export class PayoutDisbursement {
  /**
   * Create payout request
   */
  async createPayout(request: PayoutRequest): Promise<PayoutResult> {
    logger.info('Creating payout', {
      vendor_id: request.vendor_id,
      amount: request.amount,
    });

    try {
      // Validate vendor
      const vendor = await prisma.vendor.findUnique({
        where: { id: request.vendor_id },
        include: { paymentDetails: true },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Check minimum payout threshold
      const minPayout = 25; // $25 minimum
      if (request.amount < minPayout) {
        throw new Error(`Minimum payout amount is $${minPayout}`);
      }

      // Create payout record
      const payout = await prisma.vendorPayout.create({
        data: {
          vendor_id: request.vendor_id,
          amount: Math.round(request.amount * 100), // Convert to cents
          currency: request.currency,
          payment_method: request.payment_method,
          status: 'PENDING',
          created_at: new Date(),
        },
      });

      // Process payout based on method
      let result: PayoutResult;

      switch (request.payment_method) {
        case 'stripe_connect':
          result = await this.processStripeConnectPayout(payout.id, request);
          break;
        case 'bank_transfer':
          result = await this.processBankTransfer(payout.id, request);
          break;
        case 'paypal':
          result = await this.processPayPalPayout(payout.id, request);
          break;
        default:
          throw new Error(`Unsupported payment method: ${request.payment_method}`);
      }

      // Update payout record
      await prisma.vendorPayout.update({
        where: { id: payout.id },
        data: {
          status: result.status.toUpperCase(),
          transaction_id: result.transaction_id,
          processed_at: new Date(),
        },
      });

      // Send notification
      await this.notifyVendor(vendor, payout, result);

      logger.info('Payout created successfully', {
        payout_id: result.payout_id,
        status: result.status,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create payout', { error });
      throw error;
    }
  }

  /**
   * Process Stripe Connect payout
   */
  private async processStripeConnectPayout(
    payoutId: number,
    request: PayoutRequest
  ): Promise<PayoutResult> {
    logger.info('Processing Stripe Connect payout', { payout_id: payoutId });

    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: request.vendor_id },
      });

      if (!vendor?.stripe_account_id) {
        throw new Error('Vendor does not have Stripe Connect account');
      }

      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        destination: vendor.stripe_account_id,
        description: `Payout for period`,
      });

      return {
        payout_id: payoutId.toString(),
        status: 'processing',
        transaction_id: transfer.id,
        estimated_arrival: new Date(Date.now() + 2 * 86400000), // 2 days
      };
    } catch (error) {
      logger.error('Stripe Connect payout failed', { error });
      throw error;
    }
  }

  /**
   * Process bank transfer payout
   */
  private async processBankTransfer(
    payoutId: number,
    request: PayoutRequest
  ): Promise<PayoutResult> {
    logger.info('Processing bank transfer', { payout_id: payoutId });

    if (!request.bank_account) {
      throw new Error('Bank account details required');
    }

    // In production, integrate with banking API (e.g., Plaid, Dwolla)
    // For now, simulate bank transfer
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate transaction ID
    const transactionId = `BT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      payout_id: payoutId.toString(),
      status: 'processing',
      transaction_id: transactionId,
      estimated_arrival: new Date(Date.now() + 3 * 86400000), // 3-5 business days
    };
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(
    payoutId: number,
    request: PayoutRequest
  ): Promise<PayoutResult> {
    logger.info('Processing PayPal payout', { payout_id: payoutId });

    const vendor = await prisma.vendor.findUnique({
      where: { id: request.vendor_id },
    });

    if (!vendor?.paypal_email) {
      throw new Error('Vendor does not have PayPal email');
    }

    // In production, use PayPal Payouts API
    // For now, simulate PayPal payout
    await new Promise(resolve => setTimeout(resolve, 1500));

    const transactionId = `PP-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      payout_id: payoutId.toString(),
      status: 'processing',
      transaction_id: transactionId,
      estimated_arrival: new Date(Date.now() + 86400000), // 1 day
    };
  }

  /**
   * Notify vendor of payout
   */
  private async notifyVendor(
    vendor: any,
    payout: any,
    result: PayoutResult
  ): Promise<void> {
    await sendEmail({
      to: vendor.email,
      subject: 'Payout Processed',
      template: 'vendor_payout_processed',
      data: {
        vendor_name: vendor.business_name,
        amount: payout.amount / 100,
        currency: payout.currency,
        transaction_id: result.transaction_id,
        estimated_arrival: result.estimated_arrival,
      },
    });
  }

  /**
   * Schedule automatic payouts
   */
  async scheduleAutomaticPayouts(
    schedule: 'weekly' | 'biweekly' | 'monthly'
  ): Promise<void> {
    logger.info('Scheduling automatic payouts', { schedule });

    const vendors = await prisma.vendor.findMany({
      where: {
        status: 'ACTIVE',
        automatic_payouts_enabled: true,
        payout_schedule: schedule,
      },
    });

    for (const vendor of vendors) {
      try {
        const pendingAmount = await this.getPendingAmount(vendor.id);

        if (pendingAmount >= 25) {
          // Minimum threshold
          await this.createPayout({
            vendor_id: vendor.id,
            amount: pendingAmount,
            currency: 'USD',
            payment_method: vendor.preferred_payment_method || 'stripe_connect',
          });
        }
      } catch (error) {
        logger.error('Failed to process automatic payout', {
          vendor_id: vendor.id,
          error,
        });
      }
    }
  }

  /**
   * Get pending payout amount
   */
  private async getPendingAmount(vendorId: number): Promise<number> {
    const lastPayout = await prisma.vendorPayout.findFirst({
      where: { vendor_id: vendorId, status: 'COMPLETED' },
      orderBy: { created_at: 'desc' },
    });

    const startDate = lastPayout?.created_at || new Date(0);
    const endDate = new Date();

    const orders = await prisma.order.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
    });

    const grossAmount = orders.reduce((sum, order) => sum + order.total, 0);

    // Deduct commission (simplified)
    const netAmount = grossAmount * 0.85; // 15% commission

    return netAmount / 100; // Convert from cents
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: number): Promise<any> {
    const payout = await prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    return {
      payout_id: payout.id,
      status: payout.status.toLowerCase(),
      amount: payout.amount / 100,
      currency: payout.currency,
      payment_method: payout.payment_method,
      transaction_id: payout.transaction_id,
      created_at: payout.created_at,
      processed_at: payout.processed_at,
    };
  }

  /**
   * Cancel pending payout
   */
  async cancelPayout(payoutId: number): Promise<void> {
    const payout = await prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new Error('Only pending payouts can be cancelled');
    }

    await prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: 'CANCELLED',
        processed_at: new Date(),
      },
    });

    logger.info('Payout cancelled', { payout_id: payoutId });
  }
}

export default PayoutDisbursement;
