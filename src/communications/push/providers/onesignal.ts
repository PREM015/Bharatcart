/**
 * OneSignal Push Provider
 * Purpose: Send push notifications via OneSignal
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class OneSignalProvider {
  private appId: string;
  private apiKey: string;
  private baseUrl = 'https://onesignal.com/api/v1';

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '';
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
  }

  async send(
    playerIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<any> {
    logger.info('Sending push via OneSignal', { count: playerIds.length });

    try {
      const payload = {
        app_id: this.appId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data,
      };

      const response = await axios.post(`${this.baseUrl}/notifications`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
        },
      });

      logger.info('Push sent via OneSignal', { id: response.data.id });

      return {
        messageId: response.data.id,
        recipients: response.data.recipients,
        success: true,
        provider: 'onesignal',
      };
    } catch (error) {
      logger.error('OneSignal send failed', { error });
      throw new Error('Failed to send push via OneSignal');
    }
  }

  async sendToSegment(segment: string, title: string, message: string): Promise<any> {
    try {
      const payload = {
        app_id: this.appId,
        included_segments: [segment],
        headings: { en: title },
        contents: { en: message },
      };

      const response = await axios.post(`${this.baseUrl}/notifications`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
        },
      });

      return {
        messageId: response.data.id,
        success: true,
        provider: 'onesignal',
      };
    } catch (error) {
      logger.error('OneSignal segment send failed', { error });
      throw error;
    }
  }

  async createSegment(name: string, filters: any[]): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/apps/${this.appId}/segments`,
        {
          name,
          filters,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('OneSignal segment creation failed', { error });
      throw error;
    }
  }
}

export default OneSignalProvider;
