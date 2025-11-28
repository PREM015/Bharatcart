/**
 * Plivo SMS Provider
 * Purpose: Send SMS via Plivo
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class PlivoProvider {
  private authId: string;
  private authToken: string;
  private from: string;
  private baseUrl: string;

  constructor() {
    this.authId = process.env.PLIVO_AUTH_ID || '';
    this.authToken = process.env.PLIVO_AUTH_TOKEN || '';
    this.from = process.env.PLIVO_FROM || '';
    this.baseUrl = `https://api.plivo.com/v1/Account/${this.authId}`;
  }

  async send(to: string, message: string): Promise<any> {
    logger.info('Sending SMS via Plivo', { to });

    try {
      const response = await axios.post(
        `${this.baseUrl}/Message/`,
        {
          src: this.from,
          dst: to,
          text: message,
        },
        {
          auth: {
            username: this.authId,
            password: this.authToken,
          },
        }
      );

      logger.info('SMS sent via Plivo', {
        messageUuid: response.data.message_uuid,
      });

      return {
        messageId: response.data.message_uuid[0],
        success: true,
        provider: 'plivo',
      };
    } catch (error) {
      logger.error('Plivo send failed', { error });
      throw new Error('Failed to send SMS via Plivo');
    }
  }

  async getMessageDetails(messageUuid: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/Message/${messageUuid}/`,
        {
          auth: {
            username: this.authId,
            password: this.authToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get Plivo message details', { error });
      return null;
    }
  }
}

export default PlivoProvider;
