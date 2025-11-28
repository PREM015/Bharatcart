/**
 * Sezzle Buy Now Pay Later
 * Purpose: Sezzle installment payments
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class SezzleBNPL {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SEZZLE_API_KEY || '';
    this.baseUrl = process.env.SEZZLE_ENVIRONMENT === 'production'
      ? 'https://gateway.sezzle.com'
      : 'https://sandbox.gateway.sezzle.com';
  }

  async createSession(amount: number, orderRef: string): Promise<any> {
    logger.info('Creating Sezzle session', { amount, orderRef });

    const response = await axios.post(
      `${this.baseUrl}/v2/session`,
      {
        amount_in_cents: amount,
        currency_code: 'USD',
        order_description: `Order ${orderRef}`,
        order_reference_id: orderRef,
        checkout_complete_url: `${process.env.APP_URL}/payment/sezzle/complete`,
        checkout_cancel_url: `${process.env.APP_URL}/payment/sezzle/cancel`,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async completeSession(sessionUuid: string): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/v2/session/${sessionUuid}/complete`,
      {},
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      }
    );

    return response.data;
  }

  async refund(orderUuid: string, amount: number): Promise<any> {
    logger.info('Refunding Sezzle order', { orderUuid, amount });

    const response = await axios.post(
      `${this.baseUrl}/v2/order/${orderUuid}/refund`,
      { amount: { amount_in_cents: amount, currency: 'USD' } },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

export default SezzleBNPL;
