/**
 * Warehouse Zones
 * Purpose: Define and manage warehouse zones
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class WarehouseZoneManager {
  async createZone(
    warehouseId: number,
    name: string,
    type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping'
  ): Promise<any> {
    return await prisma.warehouseZone.create({
      data: {
        warehouse_id: warehouseId,
        name,
        zone_type: type,
        is_active: true,
      },
    });
  }

  async getZones(warehouseId: number): Promise<any[]> {
    return await prisma.warehouseZone.findMany({
      where: { warehouse_id: warehouseId, is_active: true },
    });
  }
}

export default WarehouseZoneManager;
