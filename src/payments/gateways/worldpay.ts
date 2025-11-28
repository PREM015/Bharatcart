/**
 * Worldpay Payment Gateway
 * Purpose: Process payments via Worldpay
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class WorldpayGateway {
  private serviceKey: string;
  private baseUrl: string;

  constructor() {
    this.serviceKey = process.env.WORLDPAY_SERVICE_KEY || '';
    this.baseUrl = process.env.WORLDPAY_ENVIRONMENT === 'production'
      ? 'https://api.worldpay.com/v1'
      : 'https://api.worldpay.com/v1';
  }

  async createOrder(
    amount: number,
    currency: string,
    token: string,
    description: string
  ): Promise<any> {
    logger.info('Creating Worldpay order', { amount, currency });

    const response = await axios.post(
      `${this.baseUrl}/orders`,
      {
        token,
        amount,
        currencyCode: currency,
        orderDescription: description,
      },
      {
        headers: {
          'Authorization': this.serviceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async refundOrder(orderCode: string, amount?: number): Promise<any> {
    logger.info('Refunding Worldpay order', { orderCode });

    const response = await axios.post(
      `${this.baseUrl}/orders/${orderCode}/refund`,
      amount ? { refundAmount: amount } : {},
      {
        headers: {
          'Authorization': this.serviceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async getOrder(orderCode: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/orders/${orderCode}`, {
      headers: { 'Authorization': this.serviceKey },
    });

    return response.data;
  }
}

export default WorldpayGateway;
