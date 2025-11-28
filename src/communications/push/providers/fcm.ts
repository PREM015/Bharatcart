/**
 * Firebase Cloud Messaging Provider
 * Purpose: Send push notifications via FCM (Android/iOS)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export interface FCMNotification {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  sound?: string;
}

export interface FCMMessage {
  token?: string;
  tokens?: string[];
  topic?: string;
  notification: FCMNotification;
  data?: Record<string, string>;
  android?: any;
  apns?: any;
}

export class FCMProvider {
  private serverKey: string;
  private baseUrl = 'https://fcm.googleapis.com/fcm/send';

  constructor() {
    this.serverKey = process.env.FCM_SERVER_KEY || '';
  }

  /**
   * Send to single device
   */
  async send(message: FCMMessage): Promise<any> {
    logger.info('Sending push via FCM', { token: message.token });

    try {
      const payload = {
        to: message.token,
        notification: message.notification,
        data: message.data,
        android: message.android,
        apns: message.apns,
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${this.serverKey}`,
        },
      });

      logger.info('Push sent via FCM', {
        messageId: response.data.message_id,
        success: response.data.success,
      });

      return {
        messageId: response.data.message_id,
        success: response.data.success === 1,
        provider: 'fcm',
      };
    } catch (error) {
      logger.error('FCM send failed', { error });
      throw new Error('Failed to send push via FCM');
    }
  }

  /**
   * Send to multiple devices
   */
  async sendMulticast(tokens: string[], notification: FCMNotification): Promise<any> {
    logger.info('Sending multicast push via FCM', { count: tokens.length });

    try {
      const payload = {
        registration_ids: tokens,
        notification,
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${this.serverKey}`,
        },
      });

      return {
        successCount: response.data.success,
        failureCount: response.data.failure,
        results: response.data.results,
        provider: 'fcm',
      };
    } catch (error) {
      logger.error('FCM multicast send failed', { error });
      throw error;
    }
  }

  /**
   * Send to topic
   */
  async sendToTopic(topic: string, notification: FCMNotification): Promise<any> {
    logger.info('Sending to topic via FCM', { topic });

    try {
      const payload = {
        to: `/topics/${topic}`,
        notification,
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${this.serverKey}`,
        },
      });

      return {
        messageId: response.data.message_id,
        success: true,
        provider: 'fcm',
      };
    } catch (error) {
      logger.error('FCM topic send failed', { error });
      throw error;
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<any> {
    try {
      const response = await axios.post(
        `https://iid.googleapis.com/iid/v1:batchAdd`,
        {
          to: `/topics/${topic}`,
          registration_tokens: tokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${this.serverKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('FCM topic subscription failed', { error });
      throw error;
    }
  }
}

export default FCMProvider;
