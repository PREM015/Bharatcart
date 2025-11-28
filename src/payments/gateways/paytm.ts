/**
 * Paytm Payment Gateway (India)
 * Purpose: Process payments via Paytm
 */

import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export class PaytmGateway {
  private merchantId: string;
  private merchantKey: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = process.env.PAYTM_MERCHANT_ID || '';
    this.merchantKey = process.env.PAYTM_MERCHANT_KEY || '';
    this.baseUrl = process.env.PAYTM_ENVIRONMENT === 'production'
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  }

  async initiateTransaction(orderId: string, amount: number, customerId: string): Promise<any> {
    logger.info('Initiating Paytm transaction', { orderId, amount });

    const params = {
      body: {
        requestType: 'Payment',
        mid: this.merchantId,
        websiteName: 'WEBSTAGING',
        orderId,
        txnAmount: {
          value: (amount / 100).toFixed(2),
          currency: 'INR',
        },
        userInfo: {
          custId: customerId,
        },
        callbackUrl: `${process.env.APP_URL}/payment/paytm/callback`,
      },
    };

    const checksum = await this.generateChecksum(JSON.stringify(params.body));

    const response = await axios.post(
      `${this.baseUrl}/theia/api/v1/initiateTransaction?mid=${this.merchantId}&orderId=${orderId}`,
      params,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.merchantId,
          'X-CHECKSUM': checksum,
        },
      }
    );

    return response.data;
  }

  async checkTransactionStatus(orderId: string): Promise<any> {
    const params = {
      body: {
        mid: this.merchantId,
        orderId,
      },
    };

    const checksum = await this.generateChecksum(JSON.stringify(params.body));

    const response = await axios.post(
      `${this.baseUrl}/v3/order/status`,
      params,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.merchantId,
          'X-CHECKSUM': checksum,
        },
      }
    );

    return response.data;
  }

  async refundTransaction(orderId: string, refId: string, amount: number): Promise<any> {
    logger.info('Refunding Paytm transaction', { orderId, amount });

    const params = {
      body: {
        mid: this.merchantId,
        orderId,
        refId,
        txnType: 'REFUND',
        refundAmount: (amount / 100).toFixed(2),
      },
    };

    const checksum = await this.generateChecksum(JSON.stringify(params.body));

    const response = await axios.post(
      `${this.baseUrl}/refund/apply`,
      params,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.merchantId,
          'X-CHECKSUM': checksum,
        },
      }
    );

    return response.data;
  }

  private async generateChecksum(body: string): Promise<string> {
    const paytmChecksum = require('paytmchecksum');
    return await paytmChecksum.generateSignature(body, this.merchantKey);
  }

  verifyChecksum(body: string, checksum: string): boolean {
    const paytmChecksum = require('paytmchecksum');
    return paytmChecksum.verifySignature(body, this.merchantKey, checksum);
  }
}

export default PaytmGateway;
