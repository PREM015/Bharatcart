/**
 * Push Notification Channel
 * Purpose: Send push notifications to mobile devices and browsers
 * Description: FCM, APNs, and web push notifications
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface PushOptions {
  userId: number;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  data?: Record<string, any>;
  action?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  sound?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  failureCount: number;
  timestamp: Date;
}

export class PushChannel {
  private fcmServerKey: string;
  private apnsCertPath?: string;

  constructor() {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || '';
    this.apnsCertPath = process.env.APNS_CERT_PATH;
  }

  /**
   * Send push notification
   */
  async send(options: PushOptions): Promise<PushResult> {
    try {
      logger.info('Sending push notification', {
        userId: options.userId,
        title: options.title,
      });

      const devices = await this.getUserDevices(options.userId);

      if (devices.length === 0) {
        logger.warn('No devices found for user', { userId: options.userId });
        return {
          success: false,
          failureCount: 0,
          timestamp: new Date(),
        };
      }

      const results = await Promise.allSettled(
        devices.map(device => this.sendToDevice(device, options))
      );

      const failureCount = results.filter(r => r.status === 'rejected').length;

      await this.trackDelivery({
        userId: options.userId,
        title: options.title,
        body: options.body,
        devicesTargeted: devices.length,
        devicesReached: devices.length - failureCount,
      });

      return {
        success: failureCount === 0,
        failureCount,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Push notification failed', { error, options });
      throw new Error('Failed to send push notification');
    }
  }

  /**
   * Send to specific device
   */
  private async sendToDevice(
    device: { token: string; platform: string },
    options: PushOptions
  ): Promise<void> {
    switch (device.platform) {
      case 'android':
        await this.sendFCM(device.token, options);
        break;
      case 'ios':
        await this.sendAPNs(device.token, options);
        break;
      case 'web':
        await this.sendWebPush(device.token, options);
        break;
      default:
        throw new Error(`Unsupported platform: ${device.platform}`);
    }
  }

  /**
   * Send via Firebase Cloud Messaging (Android)
   */
  private async sendFCM(token: string, options: PushOptions): Promise<void> {
    const message = {
      to: token,
      notification: {
        title: options.title,
        body: options.body,
        icon: options.icon,
        image: options.image,
        sound: options.sound || 'default',
        tag: options.tag,
      },
      data: options.data,
      priority: 'high',
    };

    // FCM API call would go here
    logger.debug('FCM message prepared', { token, message });
  }

  /**
   * Send via Apple Push Notification service (iOS)
   */
  private async sendAPNs(token: string, options: PushOptions): Promise<void> {
    const payload = {
      aps: {
        alert: {
          title: options.title,
          body: options.body,
        },
        badge: options.badge,
        sound: options.sound || 'default',
        'thread-id': options.tag,
      },
      data: options.data,
    };

    // APNs API call would go here
    logger.debug('APNs payload prepared', { token, payload });
  }

  /**
   * Send web push notification
   */
  private async sendWebPush(
    subscription: string,
    options: PushOptions
  ): Promise<void> {
    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      icon: options.icon,
      image: options.image,
      badge: options.badge,
      data: options.data,
      tag: options.tag,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      vibrate: options.vibrate,
    });

    // Web Push API call would go here
    logger.debug('Web push payload prepared', { subscription, payload });
  }

  /**
   * Get user devices
   */
  private async getUserDevices(
    userId: number
  ): Promise<Array<{ token: string; platform: string }>> {
    const devices = await prisma.deviceToken.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: {
        token: true,
        platform: true,
      },
    });

    return devices;
  }

  /**
   * Register device token
   */
  async registerDevice(
    userId: number,
    token: string,
    platform: 'android' | 'ios' | 'web'
  ): Promise<void> {
    await prisma.deviceToken.upsert({
      where: {
        user_id_token: {
          user_id: userId,
          token,
        },
      },
      create: {
        user_id: userId,
        token,
        platform,
        is_active: true,
        registered_at: new Date(),
      },
      update: {
        is_active: true,
        updated_at: new Date(),
      },
    });

    logger.info('Device registered', { userId, platform });
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(userId: number, token: string): Promise<void> {
    await prisma.deviceToken.updateMany({
      where: {
        user_id: userId,
        token,
      },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    logger.info('Device unregistered', { userId, token });
  }

  /**
   * Track push delivery
   */
  private async trackDelivery(data: {
    userId: number;
    title: string;
    body: string;
    devicesTargeted: number;
    devicesReached: number;
  }): Promise<void> {
    await prisma.pushDelivery.create({
      data: {
        user_id: data.userId,
        title: data.title,
        body: data.body,
        devices_targeted: data.devicesTargeted,
        devices_reached: data.devicesReached,
        sent_at: new Date(),
      },
    });
  }

  /**
   * Send bulk push notifications
   */
  async sendBulk(notifications: PushOptions[]): Promise<PushResult[]> {
    return Promise.all(notifications.map(n => this.send(n)));
  }
}

export default PushChannel;
