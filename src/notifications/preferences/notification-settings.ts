/**
 * Global Notification Settings
 * Purpose: System-wide notification configuration
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface GlobalSettings {
  rateLimits: {
    email: { perHour: number; perDay: number };
    sms: { perHour: number; perDay: number };
    push: { perHour: number; perDay: number };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export class NotificationSettings {
  private settings: GlobalSettings;

  constructor() {
    this.settings = {
      rateLimits: {
        email: { perHour: 100, perDay: 500 },
        sms: { perHour: 20, perDay: 50 },
        push: { perHour: 200, perDay: 1000 },
      },
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
      },
    };
  }

  getSettings(): GlobalSettings {
    return this.settings;
  }

  updateSettings(settings: Partial<GlobalSettings>): void {
    this.settings = { ...this.settings, ...settings };
    logger.info('Global notification settings updated', settings);
  }

  async checkRateLimit(
    userId: number,
    channel: string
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourCount = await prisma.notificationLog.count({
      where: {
        user_id: userId,
        channel,
        created_at: { gte: oneHourAgo },
      },
    });

    const dayCount = await prisma.notificationLog.count({
      where: {
        user_id: userId,
        channel,
        created_at: { gte: oneDayAgo },
      },
    });

    const limits = this.settings.rateLimits[channel as keyof typeof this.settings.rateLimits];

    if (hourCount >= limits.perHour) {
      return { allowed: false, retryAfter: 3600 };
    }

    if (dayCount >= limits.perDay) {
      return { allowed: false, retryAfter: 86400 };
    }

    return { allowed: true };
  }
}

export default NotificationSettings;
