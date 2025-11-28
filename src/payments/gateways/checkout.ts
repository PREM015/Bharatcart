/**
 * Checkout.com Payment Gateway
 * Purpose: Process payments via Checkout.com
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class CheckoutGateway {
  private secretKey: string;
  private publicKey: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = process.env.CHECKOUT_SECRET_KEY || '';
    this.publicKey = process.env.CHECKOUT_PUBLIC_KEY || '';
    this.baseUrl = process.env.CHECKOUT_ENVIRONMENT === 'production'
      ? 'https://api.checkout.com'
      : 'https://api.sandbox.checkout.com';
  }

  async createPayment(
    amount: number,
    currency: string,
    source: any,
    reference: string
  ): Promise<any> {
    logger.info('Creating Checkout.com payment', { amount, currency });

    const response = await axios.post(
      `${this.baseUrl}/payments`,
      {
        amount,
        currency,
        source,
        reference,
        capture: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async getPayment(paymentId: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${this.secretKey}` },
    });

    return response.data;
  }

  async capturePayment(paymentId: string, amount?: number): Promise<any> {
    logger.info('Capturing Checkout.com payment', { paymentId });

    const response = await axios.post(
      `${this.baseUrl}/payments/${paymentId}/captures`,
      amount ? { amount } : {},
      {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async refundPayment(paymentId: string, amount?: number, reference?: string): Promise<any> {
    logger.info('Refunding Checkout.com payment', { paymentId });

    const response = await axios.post(
      `${this.baseUrl}/payments/${paymentId}/refunds`,
      {
        amount,
        reference,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async voidPayment(paymentId: string, reference?: string): Promise<any> {
    logger.info('Voiding Checkout.com payment', { paymentId });

    const response = await axios.post(
      `${this.baseUrl}/payments/${paymentId}/voids`,
      { reference },
      {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

export default CheckoutGateway;
