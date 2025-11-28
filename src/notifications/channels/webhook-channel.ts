/**
 * Webhook Channel
 * Purpose: Send notifications via HTTP webhooks
 * Description: POST notifications to external URLs with retry logic
 */

import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface WebhookOptions {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payload: Record<string, any>;
  secret?: string;
  timeout?: number;
  retries?: number;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  timestamp: Date;
}

export class WebhookChannel {
  /**
   * Send webhook
   */
  async send(options: WebhookOptions): Promise<WebhookResult> {
    try {
      logger.info('Sending webhook', {
        url: options.url,
        method: options.method || 'POST',
      });

      const headers = this.buildHeaders(options);
      const response = await axios({
        url: options.url,
        method: options.method || 'POST',
        headers,
        data: options.payload,
        timeout: options.timeout || 30000,
      });

      await this.trackDelivery({
        url: options.url,
        method: options.method || 'POST',
        payload: options.payload,
        statusCode: response.status,
        status: 'success',
      });

      logger.info('Webhook sent successfully', {
        url: options.url,
        statusCode: response.status,
      });

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Webhook send failed', { error, options });

      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;

      await this.trackDelivery({
        url: options.url,
        method: options.method || 'POST',
        payload: options.payload,
        statusCode,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (options.retries && options.retries > 0) {
        return this.sendWithRetry(options);
      }

      throw new Error('Failed to send webhook');
    }
  }

  /**
   * Send with retry logic
   */
  async sendWithRetry(options: WebhookOptions): Promise<WebhookResult> {
    const maxRetries = options.retries || 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.send({ ...options, retries: 0 });
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Webhook attempt ${attempt} failed`, {
          error: lastError.message,
          url: options.url,
        });

        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Build request headers
   */
  private buildHeaders(options: WebhookOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'E-commerce-Webhook/1.0',
      ...options.headers,
    };

    if (options.secret) {
      const signature = this.generateSignature(options.payload, options.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    return headers;
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Track webhook delivery
   */
  private async trackDelivery(data: {
    url: string;
    method: string;
    payload: any;
    statusCode?: number;
    status: string;
    error?: string;
  }): Promise<void> {
    await prisma.webhookDelivery.create({
      data: {
        url: data.url,
        method: data.method,
        payload: JSON.stringify(data.payload),
        status_code: data.statusCode,
        status: data.status,
        error: data.error,
        sent_at: new Date(),
      },
    });
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebhookChannel;
