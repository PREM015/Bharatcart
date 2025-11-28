/**
 * SMS Channel
 * Purpose: Send SMS notifications
 * Description: SMS delivery via Twilio, AWS SNS, or other providers
 */

import { Twilio } from 'twilio';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
  mediaUrls?: string[];
}

export interface SMSResult {
  messageId: string;
  success: boolean;
  provider: string;
  timestamp: Date;
}

export class SMSChannel {
  private client: Twilio;
  private from: string;
  private provider: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'twilio';
    this.from = process.env.SMS_FROM || '';

    if (this.provider === 'twilio') {
      this.client = new Twilio(
        process.env.TWILIO_ACCOUNT_SID || '',
        process.env.TWILIO_AUTH_TOKEN || ''
      );
    }
  }

  /**
   * Send SMS
   */
  async send(options: SMSOptions): Promise<SMSResult> {
    try {
      logger.info('Sending SMS', {
        to: options.to,
        length: options.message.length,
      });

      let messageId: string;

      switch (this.provider) {
        case 'twilio':
          messageId = await this.sendTwilio(options);
          break;
        case 'sns':
          messageId = await this.sendSNS(options);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${this.provider}`);
      }

      await this.trackDelivery({
        messageId,
        to: options.to,
        message: options.message,
        status: 'sent',
      });

      logger.info('SMS sent successfully', { messageId, to: options.to });

      return {
        messageId,
        success: true,
        provider: this.provider,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('SMS send failed', { error, options });

      await this.trackDelivery({
        messageId: 'failed',
        to: options.to,
        message: options.message,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to send SMS');
    }
  }

  /**
   * Send via Twilio
   */
  private async sendTwilio(options: SMSOptions): Promise<string> {
    const message = await this.client.messages.create({
      to: options.to,
      from: options.from || this.from,
      body: options.message,
      mediaUrl: options.mediaUrls,
    });

    return message.sid;
  }

  /**
   * Send via AWS SNS
   */
  private async sendSNS(options: SMSOptions): Promise<string> {
    // AWS SNS implementation would go here
    logger.debug('SNS message prepared', { options });
    return `sns-${Date.now()}`;
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string
  ): Promise<SMSResult> {
    return this.send({
      to: phoneNumber,
      message: `Your verification code is: ${code}. Valid for 10 minutes.`,
    });
  }

  /**
   * Send OTP
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<SMSResult> {
    return this.send({
      to: phoneNumber,
      message: `Your OTP is: ${otp}. Do not share this code.`,
    });
  }

  /**
   * Track SMS delivery
   */
  private async trackDelivery(data: {
    messageId: string;
    to: string;
    message: string;
    status: string;
    error?: string;
  }): Promise<void> {
    await prisma.smsDelivery.create({
      data: {
        message_id: data.messageId,
        recipient: data.to,
        message: data.message,
        status: data.status,
        error: data.error,
        provider: this.provider,
        sent_at: new Date(),
      },
    });
  }

  /**
   * Get SMS statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    sent: number;
    delivered: number;
    failed: number;
  }> {
    const stats = await prisma.smsDelivery.groupBy({
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
      failed: stats.find(s => s.status === 'failed')?._count.status || 0,
    };
  }
}

export default SMSChannel;
