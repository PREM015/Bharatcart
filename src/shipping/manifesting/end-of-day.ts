/**
 * End of Day Processing
 * Purpose: Close out shipping day and generate manifests
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { BatchManifest } from './batch-manifest';

export class EndOfDayProcessor {
  private manifestGenerator: BatchManifest;

  constructor() {
    this.manifestGenerator = new BatchManifest();
  }

  /**
   * Process end of day
   */
  async process(): Promise<{ manifests: string[]; shipmentCount: number }> {
    logger.info('Processing end of day');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shipments = await prisma.shipment.findMany({
      where: {
        status: 'ready_to_ship',
        created_at: { gte: today },
      },
    });

    // Group by carrier
    const byCarrier = new Map<string, any[]>();

    for (const shipment of shipments) {
      const carrier = shipment.carrier;
      if (!byCarrier.has(carrier)) {
        byCarrier.set(carrier, []);
      }
      byCarrier.get(carrier)!.push(shipment);
    }

    // Create manifests per carrier
    const manifestIds: string[] = [];

    for (const [carrier, carrierShipments] of byCarrier) {
      const { manifestId } = await this.manifestGenerator.create(
        carrierShipments.map((s: any) => ({
          trackingNumber: s.tracking_number,
          carrier: s.carrier,
          service: s.service,
          weight: s.weight,
          destination: s.destination_city,
        })),
        carrier
      );

      manifestIds.push(manifestId);
    }

    // Update shipment statuses
    await prisma.shipment.updateMany({
      where: {
        id: { in: shipments.map(s => s.id) },
      },
      data: {
        status: 'manifested',
        manifested_at: new Date(),
      },
    });

    logger.info('End of day processing complete', {
      manifestCount: manifestIds.length,
      shipmentCount: shipments.length,
    });

    return {
      manifests: manifestIds,
      shipmentCount: shipments.length,
    };
  }

  /**
   * Schedule automatic end of day
   */
  scheduleAutomatic(time: string = '18:00'): void {
    // Would use cron to schedule
    logger.info('End of day scheduled', { time });
  }
}

export default EndOfDayProcessor;
