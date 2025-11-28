/**
 * PhonePe Payment Gateway (India)
 * Purpose: Process payments via PhonePe
 */

import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export class PhonePeGateway {
  private merchantId: string;
  private saltKey: string;
  private saltIndex: number;
  private baseUrl: string;

  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || '';
    this.saltKey = process.env.PHONEPE_SALT_KEY || '';
    this.saltIndex = parseInt(process.env.PHONEPE_SALT_INDEX || '1');
    this.baseUrl = process.env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  async initiatePayment(
    transactionId: string,
    amount: number,
    userId: string,
    callbackUrl: string
  ): Promise<any> {
    logger.info('Initiating PhonePe payment', { transactionId, amount });

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: amount, // in paise
      redirectUrl: callbackUrl,
      redirectMode: 'POST',
      callbackUrl,
      mobileNumber: '9999999999',
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(base64Payload);

    const response = await axios.post(
      `${this.baseUrl}/pg/v1/pay`,
      {
        request: base64Payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    return response.data;
  }

  async checkStatus(transactionId: string): Promise<any> {
    const endpoint = `/pg/v1/status/${this.merchantId}/${transactionId}`;
    const checksum = this.generateChecksum(endpoint);

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': this.merchantId,
      },
    });

    return response.data;
  }

  async refund(
    transactionId: string,
    originalTransactionId: string,
    amount: number
  ): Promise<any> {
    logger.info('Refunding PhonePe payment', { transactionId, amount });

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      originalTransactionId,
      amount,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(base64Payload);

    const response = await axios.post(
      `${this.baseUrl}/pg/v1/refund`,
      {
        request: base64Payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    return response.data;
  }

  private generateChecksum(data: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(data + this.saltKey)
      .digest('hex');
    return `${hash}###${this.saltIndex}`;
  }

  verifyChecksum(data: string, checksum: string): boolean {
    const expectedChecksum = this.generateChecksum(data);
    return checksum === expectedChecksum;
  }
}

export default PhonePeGateway;
