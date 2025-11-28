/**
 * Expiry Alerts
 * Purpose: Alert for products nearing expiry
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class ExpiryAlerter {
  async checkExpiring(daysThreshold: number = 30): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringLots = await prisma.inventoryLot.findMany({
      where: {
        expiry_date: {
          lte: thresholdDate,
          gte: new Date(),
        },
        quantity: { gt: 0 },
      },
      include: { product: true },
    });

    for (const lot of expiringLots) {
      await this.sendAlert(lot);
    }

    return expiringLots;
  }

  private async sendAlert(lot: any): Promise<void> {
    logger.warn('Expiry alert', {
      lotNumber: lot.lot_number,
      productId: lot.product_id,
      expiryDate: lot.expiry_date,
    });

    await prisma.inventoryAlert.create({
      data: {
        product_id: lot.product_id,
        alert_type: 'expiring_soon',
        message: `Lot ${lot.lot_number} expiring on ${lot.expiry_date.toLocaleDateString()}`,
        created_at: new Date(),
      },
    });
  }
}

export default ExpiryAlerter;
