/**
 * Postmark Email Provider
 * Purpose: Send transactional emails via Postmark
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class PostmarkProvider {
  private apiKey: string;
  private baseUrl = 'https://api.postmarkapp.com';
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.POSTMARK_API_KEY || '';
    this.fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@example.com';
  }

  async send(message: any): Promise<any> {
    logger.info('Sending email via Postmark', {
      to: message.to,
      subject: message.subject,
    });

    try {
      const payload = {
        From: message.from || this.fromEmail,
        To: Array.isArray(message.to) ? message.to.join(',') : message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        Cc: message.cc?.join(','),
        Bcc: message.bcc?.join(','),
        ReplyTo: message.replyTo,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
      };

      const response = await axios.post(`${this.baseUrl}/email`, payload, {
        headers: {
          'X-Postmark-Server-Token': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      logger.info('Email sent via Postmark', {
        messageId: response.data.MessageID,
      });

      return {
        messageId: response.data.MessageID,
        success: true,
        provider: 'postmark',
      };
    } catch (error) {
      logger.error('Postmark send failed', { error });
      throw new Error('Failed to send email via Postmark');
    }
  }

  async sendWithTemplate(
    to: string,
    templateId: number,
    templateData: Record<string, any>
  ): Promise<any> {
    try {
      const payload = {
        From: this.fromEmail,
        To: to,
        TemplateId: templateId,
        TemplateModel: templateData,
      };

      const response = await axios.post(
        `${this.baseUrl}/email/withTemplate`,
        payload,
        {
          headers: {
            'X-Postmark-Server-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        messageId: response.data.MessageID,
        success: true,
        provider: 'postmark',
      };
    } catch (error) {
      logger.error('Postmark template send failed', { error });
      throw error;
    }
  }
}

export default PostmarkProvider;
