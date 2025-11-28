/**
 * Vonage (Nexmo) SMS Provider
 * Purpose: Send SMS via Vonage (formerly Nexmo)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class NexmoProvider {
  private apiKey: string;
  private apiSecret: string;
  private from: string;
  private baseUrl = 'https://rest.nexmo.com';

  constructor() {
    this.apiKey = process.env.NEXMO_API_KEY || '';
    this.apiSecret = process.env.NEXMO_API_SECRET || '';
    this.from = process.env.NEXMO_FROM || 'YourBrand';
  }

  async send(to: string, message: string): Promise<any> {
    logger.info('Sending SMS via Nexmo', { to });

    try {
      const response = await axios.post(`${this.baseUrl}/sms/json`, {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        to,
        from: this.from,
        text: message,
      });

      const result = response.data.messages[0];

      logger.info('SMS sent via Nexmo', { messageId: result.message_id });

      return {
        messageId: result['message-id'],
        success: result.status === '0',
        provider: 'nexmo',
      };
    } catch (error) {
      logger.error('Nexmo send failed', { error });
      throw new Error('Failed to send SMS via Nexmo');
    }
  }

  async sendVerificationCode(to: string, brand: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/verify/json`, {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        number: to,
        brand,
      });

      return {
        requestId: response.data.request_id,
        success: response.data.status === '0',
        provider: 'nexmo',
      };
    } catch (error) {
      logger.error('Nexmo verification send failed', { error });
      throw error;
    }
  }

  async verifyCode(requestId: string, code: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/verify/check/json`, {
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        request_id: requestId,
        code,
      });

      return response.data.status === '0';
    } catch (error) {
      logger.error('Nexmo code verification failed', { error });
      return false;
    }
  }
}

export default NexmoProvider;
