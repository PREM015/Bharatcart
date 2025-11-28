/**
 * Braintree Payment Gateway (PayPal)
 * Purpose: Process payments via Braintree
 */

import braintree from 'braintree';
import { logger } from '@/lib/logger';

export class BraintreeGateway {
  private gateway: braintree.BraintreeGateway;

  constructor() {
    this.gateway = new braintree.BraintreeGateway({
      environment: process.env.BRAINTREE_ENVIRONMENT === 'production'
        ? braintree.Environment.Production
        : braintree.Environment.Sandbox,
      merchantId: process.env.BRAINTREE_MERCHANT_ID || '',
      publicKey: process.env.BRAINTREE_PUBLIC_KEY || '',
      privateKey: process.env.BRAINTREE_PRIVATE_KEY || '',
    });
  }

  async generateClientToken(customerId?: string): Promise<string> {
    const response = await this.gateway.clientToken.generate(
      customerId ? { customerId } : {}
    );
    return response.clientToken;
  }

  async createTransaction(
    amount: number,
    nonce: string,
    options?: any
  ): Promise<any> {
    logger.info('Creating Braintree transaction', { amount });

    const result = await this.gateway.transaction.sale({
      amount: (amount / 100).toFixed(2),
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true,
        ...options,
      },
    });

    if (result.success) {
      logger.info('Transaction successful', {
        id: result.transaction?.id,
      });
      return result.transaction;
    } else {
      logger.error('Transaction failed', { errors: result.message });
      throw new Error(result.message);
    }
  }

  async refundTransaction(transactionId: string, amount?: number): Promise<any> {
    logger.info('Refunding Braintree transaction', { transactionId, amount });

    const result = await this.gateway.transaction.refund(
      transactionId,
      amount ? (amount / 100).toFixed(2) : undefined
    );

    if (result.success) {
      return result.transaction;
    } else {
      throw new Error(result.message);
    }
  }

  async voidTransaction(transactionId: string): Promise<any> {
    logger.info('Voiding Braintree transaction', { transactionId });

    const result = await this.gateway.transaction.void(transactionId);

    if (result.success) {
      return result.transaction;
    } else {
      throw new Error(result.message);
    }
  }

  async createCustomer(email: string, firstName?: string, lastName?: string): Promise<string> {
    const result = await this.gateway.customer.create({
      email,
      firstName,
      lastName,
    });

    if (result.success) {
      return result.customer?.id || '';
    } else {
      throw new Error(result.message);
    }
  }

  async storePaymentMethod(customerId: string, nonce: string): Promise<string> {
    const result = await this.gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce: nonce,
    });

    if (result.success) {
      return result.paymentMethod?.token || '';
    } else {
      throw new Error(result.message);
    }
  }
}

export default BraintreeGateway;
