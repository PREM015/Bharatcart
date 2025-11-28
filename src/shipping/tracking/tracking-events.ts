/**
 * Tracking Events
 * Purpose: Standardize tracking events across carriers
 */

import { logger } from '@/lib/logger';

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

export class TrackingEventNormalizer {
  normalize(carrierEvent: any, carrier: string): TrackingEvent {
    logger.debug('Normalizing tracking event', { carrier });

    return {
      timestamp: new Date(carrierEvent.timestamp),
      status: this.normalizeStatus(carrierEvent.status, carrier),
      location: carrierEvent.location || '',
      description: carrierEvent.description || '',
    };
  }

  private normalizeStatus(status: string, carrier: string): string {
    const statusMap: Record<string, string> = {
      'in_transit': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'exception': 'exception',
      'returned': 'returned',
    };

    return statusMap[status.toLowerCase()] || 'unknown';
  }
}

export default TrackingEventNormalizer;
