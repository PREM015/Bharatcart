/**
 * Email Channel
 * Purpose: Send notifications via email
 * Description: Email delivery with templates, attachments, and tracking
 * 
 * Features:
 * - HTML and plain text emails
 * - Template support
 * - Attachment handling
 * - Delivery tracking
 * - Bounce handling
 * - Multiple providers (SendGrid, SES, Mailgun)
 * 
 * @example
 * ```typescript
 * const emailChannel = new EmailChannel();
 * await emailChannel.send({
 *   to: 'user@example.com',
 *   subject: 'Order Confirmation',
 *   template: 'order-confirmation',
 *   data: { orderId: '12345' }
 * });
 * ```
 */

import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  provider: string;
  timestamp: Date;
}

export class EmailChannel {
  private transporter: nodemailer.Transporter;
  private from: string;
  private provider: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'noreply@example.com';
    this.provider = process.env.EMAIL_PROVIDER || 'smtp';
    this.transporter = this.createTransporter();
  }

  /**
   * Create email transporter based on provider
   */
  private createTransporter(): nodemailer.Transporter {
    switch (this.provider) {
      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });

      case 'ses':
        return nodemailer.createTransport({
          host: `email.${process.env.AWS_REGION}.amazonaws.com`,
          port: 587,
          auth: {
            user: process.env.AWS_SES_ACCESS_KEY,
            pass: process.env.AWS_SES_SECRET_KEY,
          },
        });

      case 'mailgun':
        return nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          auth: {
            user: process.env.MAILGUN_USERNAME,
            pass: process.env.MAILGUN_PASSWORD,
          },
        });

      default:
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
    }
  }

  /**
   * Send email notification
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      logger.info('Sending email', {
        to: options.to,
        subject: options.subject,
        template: options.template,
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: this.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        replyTo: options.replyTo,
        headers: options.headers,
        priority: options.priority,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Track delivery
      await this.trackDelivery({
        messageId: info.messageId,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        template: options.template,
        status: 'sent',
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
      });

      return {
        messageId: info.messageId,
        success: true,
        provider: this.provider,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Email send failed', { error, options });

      await this.trackDelivery({
        messageId: 'failed',
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        template: options.template,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to send email');
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      try {
        const result = await this.send(email);
        results.push(result);
      } catch (error) {
        logger.error('Bulk email send failed', { error, email });
        results.push({
          messageId: 'failed',
          success: false,
          provider: this.provider,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Send email with retry logic
   */
  async sendWithRetry(
    options: EmailOptions,
    maxRetries: number = 3
  ): Promise<EmailResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.send(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Email send attempt ${attempt} failed`, {
          error: lastError.message,
          to: options.to,
        });

        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Verify email delivery
   */
  async verifyDelivery(messageId: string): Promise<boolean> {
    const delivery = await prisma.emailDelivery.findUnique({
      where: { message_id: messageId },
    });

    return delivery?.status === 'delivered';
  }

  /**
   * Track email delivery
   */
  private async trackDelivery(data: {
    messageId: string;
    to: string[];
    subject: string;
    template?: string;
    status: string;
    error?: string;
  }): Promise<void> {
    await prisma.emailDelivery.create({
      data: {
        message_id: data.messageId,
        recipients: JSON.stringify(data.to),
        subject: data.subject,
        template: data.template,
        status: data.status,
        error: data.error,
        provider: this.provider,
        sent_at: new Date(),
      },
    });
  }

  /**
   * Handle email bounces
   */
  async handleBounce(messageId: string, reason: string): Promise<void> {
    await prisma.emailDelivery.update({
      where: { message_id: messageId },
      data: {
        status: 'bounced',
        error: reason,
        bounced_at: new Date(),
      },
    });

    logger.warn('Email bounced', { messageId, reason });
  }

  /**
   * Get email statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
  }> {
    const stats = await prisma.emailDelivery.groupBy({
      by: ['status'],
      where: {
        sent_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { status: true },
    });

    return {
      sent: stats.find(s => s.status === 'sent')?._count.status || 0,
      delivered: stats.find(s => s.status === 'delivered')?._count.status || 0,
      bounced: stats.find(s => s.status === 'bounced')?._count.status || 0,
      failed: stats.find(s => s.status === 'failed')?._count.status || 0,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EmailChannel;
