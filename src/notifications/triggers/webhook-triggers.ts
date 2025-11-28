/**
 * Webhook Triggers
 * Purpose: Trigger notifications from external webhooks
 */

import { logger } from '@/lib/logger';
import { WebhookChannel } from '../channels/webhook-channel';

export class WebhookTriggers {
  private webhookChannel: WebhookChannel;

  constructor() {
    this.webhookChannel = new WebhookChannel();
  }

  async handleIncomingWebhook(
    event: string,
    payload: any,
    signature?: string
  ): Promise<void> {
    logger.info('Webhook received', { event });

    if (signature) {
      const isValid = this.webhookChannel.verifySignature(
        payload,
        signature,
        process.env.WEBHOOK_SECRET || ''
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    switch (event) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      default:
        logger.warn('Unknown webhook event', { event });
    }
  }

  private async handlePaymentSucceeded(payload: any): Promise<void> {
    logger.info('Payment succeeded webhook', payload);
  }

  private async handlePaymentFailed(payload: any): Promise<void> {
    logger.info('Payment failed webhook', payload);
  }
}

export default WebhookTriggers;
