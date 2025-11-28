/**
 * Mollie Payment Gateway
 * Purpose: Process payments via Mollie (Europe)
 */

import { createMollieClient } from '@mollie/api-client';
import { logger } from '@/lib/logger';

export class MollieGateway {
  private client: any;

  constructor() {
    this.client = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY || '',
    });
  }

  async createPayment(amount: number, currency: string, description: string, redirectUrl: string): Promise<any> {
    logger.info('Creating Mollie payment', { amount, currency });

    const payment = await this.client.payments.create({
      amount: {
        value: (amount / 100).toFixed(2),
        currency,
      },
      description,
      redirectUrl,
      webhookUrl: process.env.MOLLIE_WEBHOOK_URL,
    });

    return payment;
  }

  async getPayment(paymentId: string): Promise<any> {
    return await this.client.payments.get(paymentId);
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    logger.info('Refunding Mollie payment', { paymentId });

    return await this.client.payments.refund(paymentId, {
      amount: amount ? { value: (amount / 100).toFixed(2), currency: 'EUR' } : undefined,
    });
  }

  async cancelPayment(paymentId: string): Promise<any> {
    return await this.client.payments.cancel(paymentId);
  }
}

export default MollieGateway;
