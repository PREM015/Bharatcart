/**
 * User Notification Preferences
 * Purpose: Manage user-specific notification settings
 * Description: Per-channel and per-event preferences
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface NotificationPreference {
  userId: number;
  channel: 'email' | 'push' | 'sms';
  event: string;
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  quietHours?: {
    start: string;
    end: string;
  };
}

export class UserPreferences {
  /**
   * Get user preferences
   */
  async get(userId: number): Promise<NotificationPreference[]> {
    const prefs = await prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    return prefs.map(p => ({
      userId: p.user_id,
      channel: p.channel as any,
      event: p.event,
      enabled: p.enabled,
      frequency: p.frequency as any,
      quietHours: p.quiet_hours ? JSON.parse(p.quiet_hours) : undefined,
    }));
  }

  /**
   * Update preference
   */
  async update(pref: NotificationPreference): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: {
        user_id_channel_event: {
          user_id: pref.userId,
          channel: pref.channel,
          event: pref.event,
        },
      },
      create: {
        user_id: pref.userId,
        channel: pref.channel,
        event: pref.event,
        enabled: pref.enabled,
        frequency: pref.frequency,
        quiet_hours: pref.quietHours ? JSON.stringify(pref.quietHours) : null,
      },
      update: {
        enabled: pref.enabled,
        frequency: pref.frequency,
        quiet_hours: pref.quietHours ? JSON.stringify(pref.quietHours) : null,
        updated_at: new Date(),
      },
    });

    logger.info('Notification preference updated', pref);
  }

  /**
   * Check if notification is allowed
   */
  async isAllowed(
    userId: number,
    channel: string,
    event: string
  ): Promise<boolean> {
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        user_id_channel_event: {
          user_id: userId,
          channel,
          event,
        },
      },
    });

    if (!pref) return true;
    if (!pref.enabled) return false;

    if (pref.quiet_hours) {
      const quietHours = JSON.parse(pref.quiet_hours);
      if (this.isQuietHour(quietHours)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHour(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Set default preferences for new user
   */
  async setDefaults(userId: number): Promise<void> {
    const defaults: Omit<NotificationPreference, 'userId'>[] = [
      { channel: 'email', event: 'order_confirmation', enabled: true, frequency: 'immediate' },
      { channel: 'email', event: 'order_shipped', enabled: true, frequency: 'immediate' },
      { channel: 'email', event: 'order_delivered', enabled: true, frequency: 'immediate' },
      { channel: 'push', event: 'order_status', enabled: true, frequency: 'immediate' },
      { channel: 'push', event: 'promotional', enabled: false },
      { channel: 'sms', event: 'order_confirmation', enabled: false },
    ];

    for (const pref of defaults) {
      await this.update({ ...pref, userId });
    }

    logger.info('Default preferences set', { userId });
  }

  /**
   * Unsubscribe from all notifications
   */
  async unsubscribeAll(userId: number): Promise<void> {
    await prisma.notificationPreference.updateMany({
      where: { user_id: userId },
      data: { enabled: false, updated_at: new Date() },
    });

    logger.info('User unsubscribed from all notifications', { userId });
  }
}

export default UserPreferences;
