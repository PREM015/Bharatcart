/**
 * Affirm Buy Now Pay Later
 * Purpose: Affirm financing integration
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class AffirmBNPL {
  private publicKey: string;
  private privateKey: string;
  private baseUrl: string;

  constructor() {
    this.publicKey = process.env.AFFIRM_PUBLIC_KEY || '';
    this.privateKey = process.env.AFFIRM_PRIVATE_KEY || '';
    this.baseUrl = process.env.AFFIRM_ENVIRONMENT === 'production'
      ? 'https://api.affirm.com'
      : 'https://sandbox.affirm.com';
  }

  async createCheckout(amount: number, items: any[]): Promise<string> {
    logger.info('Creating Affirm checkout', { amount });

    const response = await axios.post(
      `${this.baseUrl}/api/v2/checkout`,
      {
        merchant: {
          user_confirmation_url: `${process.env.APP_URL}/payment/affirm/confirm`,
          user_cancel_url: `${process.env.APP_URL}/payment/affirm/cancel`,
        },
        shipping: {},
        billing: {},
        items,
        metadata: {},
        order_id: `ORDER-${Date.now()}`,
        total: amount,
      },
      {
        auth: {
          username: this.publicKey,
          password: this.privateKey,
        },
      }
    );

    return response.data.checkout_id;
  }

  async authorizeCharge(checkoutToken: string): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/api/v2/charges`,
      { checkout_token: checkoutToken },
      {
        auth: {
          username: this.publicKey,
          password: this.privateKey,
        },
      }
    );

    return response.data;
  }

  async captureCharge(chargeId: string): Promise<any> {
    logger.info('Capturing Affirm charge', { chargeId });

    const response = await axios.post(
      `${this.baseUrl}/api/v2/charges/${chargeId}/capture`,
      {},
      {
        auth: {
          username: this.publicKey,
          password: this.privateKey,
        },
      }
    );

    return response.data;
  }

  async refundCharge(chargeId: string, amount?: number): Promise<any> {
    logger.info('Refunding Affirm charge', { chargeId });

    const response = await axios.post(
      `${this.baseUrl}/api/v2/charges/${chargeId}/refund`,
      amount ? { amount } : {},
      {
        auth: {
          username: this.publicKey,
          password: this.privateKey,
        },
      }
    );

    return response.data;
  }
}

export default AffirmBNPL;
