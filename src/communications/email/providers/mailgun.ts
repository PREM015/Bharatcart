/**
 * Mailgun Email Provider
 * Purpose: Send emails via Mailgun API
 */

import axios from 'axios';
import FormData from 'form-data';
import { logger } from '@/lib/logger';

export class MailgunProvider {
  private apiKey: string;
  private domain: string;
  private baseUrl: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY || '';
    this.domain = process.env.MAILGUN_DOMAIN || '';
    this.baseUrl = `https://api.mailgun.net/v3/${this.domain}`;
    this.fromEmail = process.env.MAILGUN_FROM_EMAIL || 'noreply@example.com';
  }

  async send(message: any): Promise<any> {
    logger.info('Sending email via Mailgun', {
      to: message.to,
      subject: message.subject,
    });

    try {
      const form = new FormData();
      form.append('from', message.from || this.fromEmail);
      form.append('to', Array.isArray(message.to) ? message.to.join(',') : message.to);
      form.append('subject', message.subject);

      if (message.html) form.append('html', message.html);
      if (message.text) form.append('text', message.text);
      if (message.cc) form.append('cc', message.cc.join(','));
      if (message.bcc) form.append('bcc', message.bcc.join(','));

      const response = await axios.post(`${this.baseUrl}/messages`, form, {
        auth: {
          username: 'api',
          password: this.apiKey,
        },
        headers: form.getHeaders(),
      });

      logger.info('Email sent via Mailgun', { messageId: response.data.id });

      return {
        messageId: response.data.id,
        success: true,
        provider: 'mailgun',
      };
    } catch (error) {
      logger.error('Mailgun send failed', { error });
      throw new Error('Failed to send email via Mailgun');
    }
  }

  async getEvents(limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/events`, {
        auth: {
          username: 'api',
          password: this.apiKey,
        },
        params: { limit },
      });

      return response.data.items;
    } catch (error) {
      logger.error('Failed to get Mailgun events', { error });
      return [];
    }
  }
}

export default MailgunProvider;
