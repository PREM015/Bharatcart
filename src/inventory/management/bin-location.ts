/**
 * Bin Location Management
 * Purpose: Manage warehouse bin locations
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class BinLocationManager {
  async createLocation(
    warehouseId: number,
    zone: string,
    aisle: string,
    rack: string,
    shelf: string
  ): Promise<any> {
    const code = `${zone}-${aisle}-${rack}-${shelf}`;

    return await prisma.binLocation.create({
      data: {
        warehouse_id: warehouseId,
        code,
        zone,
        aisle,
        rack,
        shelf,
        is_active: true,
      },
    });
  }

  async assignProductToLocation(
    productId: number,
    locationId: number,
    quantity: number
  ): Promise<void> {
    await prisma.inventoryItem.create({
      data: {
        product_id: productId,
        bin_location_id: locationId,
        quantity_on_hand: quantity,
        quantity_available: quantity,
      },
    });
  }

  async findOptimalLocation(
    warehouseId: number,
    productType: string
  ): Promise<any> {
    // Find empty location in appropriate zone
    return await prisma.binLocation.findFirst({
      where: {
        warehouse_id: warehouseId,
        zone: productType === 'fast_moving' ? 'A' : 'B',
        inventoryItems: { none: {} },
      },
    });
  }
}

export default BinLocationManager;
