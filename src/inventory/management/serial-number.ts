/**
 * Serial Number Tracking
 * Purpose: Track individual items by serial number
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class SerialNumberTracker {
  async registerSerial(
    productId: number,
    serialNumber: string,
    warehouseId: number
  ): Promise<void> {
    await prisma.serialNumber.create({
      data: {
        product_id: productId,
        serial_number: serialNumber,
        warehouse_id: warehouseId,
        status: 'available',
        registered_at: new Date(),
      },
    });
  }

  async allocateSerial(serialNumber: string, orderId: number): Promise<boolean> {
    const serial = await prisma.serialNumber.findUnique({
      where: { serial_number: serialNumber },
    });

    if (!serial || serial.status !== 'available') return false;

    await prisma.serialNumber.update({
      where: { serial_number: serialNumber },
      data: {
        status: 'allocated',
        order_id: orderId,
        allocated_at: new Date(),
      },
    });

    return true;
  }

  async trackSerial(serialNumber: string): Promise<any> {
    return await prisma.serialNumber.findUnique({
      where: { serial_number: serialNumber },
      include: {
        product: true,
        order: true,
      },
    });
  }
}

export default SerialNumberTracker;
