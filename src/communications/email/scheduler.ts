/**
 * Email Scheduler
 * Purpose: Schedule emails for future delivery
 */

import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ScheduledEmail {
  id?: number;
  to: string;
  subject: string;
  html: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
}

export class EmailScheduler {
  /**
   * Schedule email for later
   */
  async schedule(email: ScheduledEmail): Promise<number> {
    logger.info('Scheduling email', {
      to: email.to,
      scheduledFor: email.scheduledFor,
    });

    const scheduled = await prisma.scheduledEmail.create({
      data: {
        recipient: email.to,
        subject: email.subject,
        html_content: email.html,
        scheduled_for: email.scheduledFor,
        status: 'pending',
        created_at: new Date(),
      },
    });

    return scheduled.id;
  }

  /**
   * Initialize scheduler (runs every minute)
   */
  initialize(): void {
    cron.schedule('* * * * *', async () => {
      await this.processPendingEmails();
    });

    logger.info('Email scheduler initialized');
  }

  /**
   * Process pending emails
   */
  private async processPendingEmails(): Promise<void> {
    const now = new Date();

    const pending = await prisma.scheduledEmail.findMany({
      where: {
        status: 'pending',
        scheduled_for: { lte: now },
      },
      take: 50,
    });

    for (const email of pending) {
      try {
        // Send email via provider
        logger.info('Sending scheduled email', { id: email.id });

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'sent', sent_at: new Date() },
        });
      } catch (error) {
        logger.error('Failed to send scheduled email', { error, id: email.id });

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'failed' },
        });
      }
    }
  }

  /**
   * Cancel scheduled email
   */
  async cancel(emailId: number): Promise<void> {
    await prisma.scheduledEmail.delete({
      where: { id: emailId },
    });

    logger.info('Scheduled email cancelled', { emailId });
  }

  /**
   * Get scheduled emails
   */
  async getScheduled(status?: string): Promise<ScheduledEmail[]> {
    const emails = await prisma.scheduledEmail.findMany({
      where: status ? { status } : undefined,
      orderBy: { scheduled_for: 'asc' },
    });

    return emails.map(e => ({
      id: e.id,
      to: e.recipient,
      subject: e.subject,
      html: e.html_content,
      scheduledFor: e.scheduled_for,
      status: e.status as any,
    }));
  }
}

export default EmailScheduler;
