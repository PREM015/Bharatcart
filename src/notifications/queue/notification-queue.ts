/**
 * Notification Queue
 * Purpose: Queue notifications for asynchronous processing
 */

import Bull from 'bull';
import { logger } from '@/lib/logger';
import { EmailChannel } from '../channels/email-channel';
import { PushChannel } from '../channels/push-channel';
import { SMSChannel } from '../channels/sms-channel';

export interface QueuedNotification {
  id: string;
  type: 'email' | 'push' | 'sms';
  recipient: any;
  data: any;
  priority?: number;
  scheduledFor?: Date;
}

export class NotificationQueue {
  private queue: Bull.Queue;
  private emailChannel: EmailChannel;
  private pushChannel: PushChannel;
  private smsChannel: SMSChannel;

  constructor() {
    this.queue = new Bull('notifications', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.emailChannel = new EmailChannel();
    this.pushChannel = new PushChannel();
    this.smsChannel = new SMSChannel();

    this.setupProcessors();
  }

  private setupProcessors(): void {
    this.queue.process('email', async (job) => {
      logger.info('Processing email job', { jobId: job.id });
      await this.emailChannel.send(job.data);
    });

    this.queue.process('push', async (job) => {
      logger.info('Processing push job', { jobId: job.id });
      await this.pushChannel.send(job.data);
    });

    this.queue.process('sms', async (job) => {
      logger.info('Processing SMS job', { jobId: job.id });
      await this.smsChannel.send(job.data);
    });
  }

  async enqueue(notification: QueuedNotification): Promise<void> {
    const options: Bull.JobOptions = {
      priority: notification.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    if (notification.scheduledFor) {
      options.delay = notification.scheduledFor.getTime() - Date.now();
    }

    await this.queue.add(notification.type, notification.data, options);
    logger.info('Notification queued', { type: notification.type });
  }

  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

export default NotificationQueue;
