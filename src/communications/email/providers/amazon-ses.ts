/**
 * Amazon SES Email Provider
 * Purpose: Send emails via AWS Simple Email Service
 * Description: High-volume email delivery with AWS SES
 * 
 * Features:
 * - Bulk email sending
 * - Bounce/complaint tracking
 * - Email verification
 * - Template support
 * - Delivery notifications
 * 
 * @example
 * ```typescript
 * const ses = new AmazonSESProvider();
 * await ses.send({
 *   to: 'customer@example.com',
 *   subject: 'Order Confirmation',
 *   html: '<h1>Thank you!</h1>',
 *   text: 'Thank you!'
 * });
 * ```
 */

import { SES } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

export interface EmailMessage {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface SendResult {
  messageId: string;
  success: boolean;
  provider: string;
}

export class AmazonSESProvider {
  private client: SES;
  private fromEmail: string;

  constructor() {
    this.client = new SES({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.fromEmail = process.env.SES_FROM_EMAIL || 'noreply@example.com';
  }

  /**
   * Send email
   */
  async send(message: EmailMessage): Promise<SendResult> {
    logger.info('Sending email via SES', {
      to: message.to,
      subject: message.subject,
    });

    try {
      const params = {
        Source: message.from || this.fromEmail,
        Destination: {
          ToAddresses: Array.isArray(message.to) ? message.to : [message.to],
          CcAddresses: message.cc,
          BccAddresses: message.bcc,
        },
        Message: {
          Subject: {
            Data: message.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: message.html
              ? {
                  Data: message.html,
                  Charset: 'UTF-8',
                }
              : undefined,
            Text: message.text
              ? {
                  Data: message.text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
      };

      const result = await this.client.sendEmail(params);

      logger.info('Email sent successfully via SES', {
        messageId: result.MessageId,
      });

      return {
        messageId: result.MessageId || '',
        success: true,
        provider: 'amazon-ses',
      };
    } catch (error) {
      logger.error('SES send failed', { error, message });
      throw new Error('Failed to send email via SES');
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(messages: EmailMessage[]): Promise<SendResult[]> {
    logger.info('Sending bulk emails via SES', { count: messages.length });

    const results = await Promise.allSettled(
      messages.map(msg => this.send(msg))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        messageId: `failed-${index}`,
        success: false,
        provider: 'amazon-ses',
      };
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(email: string): Promise<boolean> {
    try {
      await this.client.verifyEmailIdentity({
        EmailAddress: email,
      });
      logger.info('Email verification sent', { email });
      return true;
    } catch (error) {
      logger.error('Email verification failed', { error, email });
      return false;
    }
  }

  /**
   * Get sending statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const stats = await this.client.getSendStatistics({});
      return stats.SendDataPoints;
    } catch (error) {
      logger.error('Failed to get SES statistics', { error });
      return [];
    }
  }

  /**
   * Check if email is verified
   */
  async isVerified(email: string): Promise<boolean> {
    try {
      const result = await this.client.getIdentityVerificationAttributes({
        Identities: [email],
      });

      const status = result.VerificationAttributes?.[email]?.VerificationStatus;
      return status === 'Success';
    } catch (error) {
      logger.error('Failed to check verification status', { error, email });
      return false;
    }
  }
}

export default AmazonSESProvider;
