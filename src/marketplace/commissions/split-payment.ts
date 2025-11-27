/**
 * Split Payment System
 * Purpose: Split payments between platform and vendors
 * Description: Automatic fund distribution using Stripe Connect
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { FeeCalculator } from './fee-calculator';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface SplitPaymentRequest {
  order_id: number;
  total_amount: number;
  vendor_id: number;
  payment_intent_id: string;
}

export class SplitPaymentSystem {
  private feeCalculator: FeeCalculator;

  constructor() {
    this.feeCalculator = new FeeCalculator();
  }

  /**
   * Split payment between platform and vendor
   */
  async splitPayment(request: SplitPaymentRequest): Promise<{
    platform_amount: number;
    vendor_amount: number;
    transfer_id: string;
  }> {
    logger.info('Processing split payment', {
      order_id: request.order_id,
      total_amount: request.total_amount,
    });

    try {
      // Get vendor Stripe account
      const vendor = await prisma.vendor.findUnique({
        where: { id: request.vendor_id },
      });

      if (!vendor?.stripe_account_id) {
        throw new Error('Vendor does not have connected Stripe account');
      }

      // Calculate fees
      const feeBreakdown = await this.feeCalculator.calculateFees(
        request.vendor_id,
        request.total_amount
      );

      const platformAmount = Math.round(feeBreakdown.total_fees * 100); // Convert to cents
      const vendorAmount = Math.round(feeBreakdown.vendor_earnings * 100);

      // Create transfer to vendor's connected account
      const transfer = await stripe.transfers.create({
        amount: vendorAmount,
        currency: 'usd',
        destination: vendor.stripe_account_id,
        transfer_group: `order_${request.order_id}`,
        description: `Payment for order ${request.order_id}`,
        metadata: {
          order_id: request.order_id.toString(),
          vendor_id: request.vendor_id.toString(),
        },
      });

      // Record split payment
      await prisma.splitPayment.create({
        data: {
          order_id: request.order_id,
          vendor_id: request.vendor_id,
          total_amount: Math.round(request.total_amount * 100),
          platform_amount: platformAmount,
          vendor_amount: vendorAmount,
          transfer_id: transfer.id,
          status: 'COMPLETED',
          processed_at: new Date(),
        },
      });

      logger.info('Split payment processed', {
        transfer_id: transfer.id,
        vendor_amount: vendorAmount / 100,
      });

      return {
        platform_amount: platformAmount / 100,
        vendor_amount: vendorAmount / 100,
        transfer_id: transfer.id,
      };
    } catch (error) {
      logger.error('Split payment failed', { error });
      throw error;
    }
  }

  /**
   * Split payment for multi-vendor order
   */
  async splitMultiVendorPayment(
    orderId: number,
    vendorAmounts: Array<{ vendor_id: number; amount: number }>
  ): Promise<void> {
    logger.info('Processing multi-vendor split payment', {
      order_id: orderId,
      vendor_count: vendorAmounts.length,
    });

    for (const { vendor_id, amount } of vendorAmounts) {
      await this.splitPayment({
        order_id: orderId,
        total_amount: amount,
        vendor_id,
        payment_intent_id: '',
      });
    }
  }

  /**
   * Reverse split payment (for refunds)
   */
  async reverseSplitPayment(
    orderId: number,
    refundAmount: number
  ): Promise<void> {
    logger.info('Reversing split payment', {
      order_id: orderId,
      refund_amount: refundAmount,
    });

    const splitPayment = await prisma.splitPayment.findFirst({
      where: { order_id: orderId },
    });

    if (!splitPayment) {
      throw new Error('Split payment not found');
    }

    // Create reversal transfer
    await stripe.transfers.createReversal(splitPayment.transfer_id, {
      amount: Math.round(refundAmount * 100),
    });

    await prisma.splitPayment.update({
      where: { id: splitPayment.id },
      data: {
        status: 'REVERSED',
      },
    });
  }
}

export default SplitPaymentSystem;
