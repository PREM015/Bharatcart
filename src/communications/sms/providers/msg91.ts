/**
 * MSG91 SMS Provider
 * Purpose: Send SMS via MSG91 (India)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class MSG91Provider {
  private authKey: string;
  private senderId: string;
  private baseUrl = 'https://api.msg91.com/api';

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
    this.senderId = process.env.MSG91_SENDER_ID || '';
  }

  async send(to: string, message: string): Promise<any> {
    logger.info('Sending SMS via MSG91', { to });

    try {
      const response = await axios.post(`${this.baseUrl}/sendhttp.php`, null, {
        params: {
          authkey: this.authKey,
          mobiles: to,
          message,
          sender: this.senderId,
          route: '4',
          country: '91',
        },
      });

      logger.info('SMS sent via MSG91', { response: response.data });

      return {
        messageId: response.data.message,
        success: response.data.type === 'success',
        provider: 'msg91',
      };
    } catch (error) {
      logger.error('MSG91 send failed', { error });
      throw new Error('Failed to send SMS via MSG91');
    }
  }

  async sendOTP(to: string, otp: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/v5/otp`, {
        authkey: this.authKey,
        mobile: to,
        otp,
      });

      return {
        messageId: response.data.request_id,
        success: response.data.type === 'success',
        provider: 'msg91',
      };
    } catch (error) {
      logger.error('MSG91 OTP send failed', { error });
      throw error;
    }
  }

  async verifyOTP(mobile: string, otp: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/v5/otp/verify`, {
        authkey: this.authKey,
        mobile,
        otp,
      });

      return response.data.type === 'success';
    } catch (error) {
      logger.error('MSG91 OTP verification failed', { error });
      return false;
    }
  }
}

export default MSG91Provider;
