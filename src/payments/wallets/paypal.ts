/**
 * PayPal Wallet Integration
 * Purpose: Process PayPal payments
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class PayPalWallet {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = process.env.PAYPAL_ENVIRONMENT === 'production'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
  }

  async getAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: this.clientId,
          password: this.clientSecret,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.access_token;
  }

  async createOrder(amount: number, currency: string): Promise<any> {
    logger.info('Creating PayPal order', { amount, currency });

    const token = await this.getAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: (amount / 100).toFixed(2),
            },
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async captureOrder(orderId: string): Promise<any> {
    logger.info('Capturing PayPal order', { orderId });

    const token = await this.getAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async refund(captureId: string, amount: number, currency: string): Promise<any> {
    logger.info('Refunding PayPal payment', { captureId, amount });

    const token = await this.getAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
      {
        amount: {
          currency_code: currency,
          value: (amount / 100).toFixed(2),
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

export default PayPalWallet;
