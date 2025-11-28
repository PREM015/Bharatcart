/**
 * Pusher Beams Push Provider
 * Purpose: Send push notifications via Pusher Beams
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class PusherBeamsProvider {
  private instanceId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.instanceId = process.env.PUSHER_INSTANCE_ID || '';
    this.secretKey = process.env.PUSHER_SECRET_KEY || '';
    this.baseUrl = `https://${this.instanceId}.pushnotifications.pusher.com`;
  }

  async publishToUsers(
    userIds: string[],
    notification: { title: string; body: string }
  ): Promise<any> {
    logger.info('Publishing via Pusher Beams to users', {
      count: userIds.length,
    });

    try {
      const payload = {
        users: userIds,
        fcm: {
          notification: {
            title: notification.title,
            body: notification.body,
          },
        },
        apns: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
          },
        },
      };

      const response = await axios.post(`${this.baseUrl}/publishes/users`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      return {
        publishId: response.data.publishId,
        success: true,
        provider: 'pusher-beams',
      };
    } catch (error) {
      logger.error('Pusher Beams send failed', { error });
      throw error;
    }
  }

  async publishToInterests(
    interests: string[],
    notification: { title: string; body: string }
  ): Promise<any> {
    logger.info('Publishing via Pusher Beams to interests', {
      interests,
    });

    try {
      const payload = {
        interests,
        fcm: {
          notification: {
            title: notification.title,
            body: notification.body,
          },
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/publishes/interests`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return {
        publishId: response.data.publishId,
        success: true,
        provider: 'pusher-beams',
      };
    } catch (error) {
      logger.error('Pusher Beams interest send failed', { error });
      throw error;
    }
  }
}

export default PusherBeamsProvider;
