/**
 * Delivery Exceptions
 * Purpose: Handle delivery exceptions and alerts
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface DeliveryException {
  trackingNumber: string;
  type: 'delayed' | 'failed_delivery' | 'damaged' | 'lost' | 'returned';
  reason: string;
  occurredAt: Date;
}

export class DeliveryExceptionHandler {
  async record(exception: DeliveryException): Promise<void> {
    logger.warn('Recording delivery exception', exception);

    await prisma.deliveryException.create({
      data: {
        tracking_number: exception.trackingNumber,
        exception_type: exception.type,
        reason: exception.reason,
        occurred_at: exception.occurredAt,
        created_at: new Date(),
      },
    });

    await this.notifyCustomer(exception);
  }

  private async notifyCustomer(exception: DeliveryException): Promise<void> {
    // Send notification to customer
    logger.info('Notifying customer of exception', {
      trackingNumber: exception.trackingNumber,
    });
  }

  async getExceptions(trackingNumber: string): Promise<DeliveryException[]> {
    const exceptions = await prisma.deliveryException.findMany({
      where: { tracking_number: trackingNumber },
      orderBy: { occurred_at: 'desc' },
    });

    return exceptions.map(e => ({
      trackingNumber: e.tracking_number,
      type: e.exception_type as any,
      reason: e.reason,
      occurredAt: e.occurred_at,
    }));
  }
}

export default DeliveryExceptionHandler;
