/**
 * Wave Picking
 * Purpose: Batch order picking optimization
 * Description: Group orders into waves for efficient warehouse picking
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface Wave {
  id?: number;
  name: string;
  warehouseId: number;
  orders: number[];
  status: 'created' | 'released' | 'picking' | 'completed';
  createdAt?: Date;
  releasedAt?: Date;
  completedAt?: Date;
}

export class WavePickingManager {
  /**
   * Create picking wave
   */
  async createWave(
    warehouseId: number,
    orderIds: number[],
    name?: string
  ): Promise<Wave> {
    logger.info('Creating picking wave', {
      warehouseId,
      orderCount: orderIds.length,
    });

    const wave = await prisma.pickingWave.create({
      data: {
        name: name || `WAVE-${Date.now()}`,
        warehouse_id: warehouseId,
        order_ids: JSON.stringify(orderIds),
        status: 'created',
        created_at: new Date(),
      },
    });

    return {
      id: wave.id,
      name: wave.name,
      warehouseId: wave.warehouse_id,
      orders: JSON.parse(wave.order_ids),
      status: wave.status as any,
      createdAt: wave.created_at,
    };
  }

  /**
   * Auto-create waves based on criteria
   */
  async autoCreateWaves(
    warehouseId: number,
    criteria: {
      maxOrders?: number;
      priority?: string;
      zone?: string;
    }
  ): Promise<Wave[]> {
    logger.info('Auto-creating waves', { warehouseId, criteria });

    const maxOrders = criteria.maxOrders || 20;

    // Get pending orders
    const orders = await prisma.order.findMany({
      where: {
        status: 'confirmed',
        allocations: {
          some: { warehouse_id: warehouseId },
        },
      },
      take: 100,
      orderBy: { created_at: 'asc' },
    });

    const waves: Wave[] = [];
    
    for (let i = 0; i < orders.length; i += maxOrders) {
      const batchOrders = orders.slice(i, i + maxOrders);
      const wave = await this.createWave(
        warehouseId,
        batchOrders.map(o => o.id),
        `AUTO-WAVE-${Date.now()}-${i / maxOrders + 1}`
      );
      waves.push(wave);
    }

    return waves;
  }

  /**
   * Release wave for picking
   */
  async releaseWave(waveId: number): Promise<void> {
    logger.info('Releasing wave', { waveId });

    await prisma.pickingWave.update({
      where: { id: waveId },
      data: {
        status: 'released',
        released_at: new Date(),
      },
    });

    // Generate pick lists
    await this.generatePickLists(waveId);
  }

  /**
   * Generate pick lists for wave
   */
  private async generatePickLists(waveId: number): Promise<void> {
    const wave = await prisma.pickingWave.findUnique({
      where: { id: waveId },
    });

    if (!wave) return;

    const orderIds = JSON.parse(wave.order_ids);

    // Get all items to pick
    const allocations = await prisma.inventoryAllocation.findMany({
      where: {
        order_id: { in: orderIds },
        warehouse_id: wave.warehouse_id,
      },
      include: {
        product: true,
        inventoryItem: {
          include: {
            binLocation: true,
          },
        },
      },
    });

    // Group by bin location for efficient picking
    const pickList = allocations.map(a => ({
      productId: a.product_id,
      productName: a.product.name,
      sku: a.product.sku,
      quantity: a.quantity_allocated,
      binLocation: a.inventoryItem?.binLocation?.code || 'UNLOCATED',
    }));

    // Sort by bin location
    pickList.sort((a, b) => a.binLocation.localeCompare(b.binLocation));

    logger.info('Pick list generated', { waveId, itemCount: pickList.length });
  }

  /**
   * Complete wave
   */
  async completeWave(waveId: number): Promise<void> {
    logger.info('Completing wave', { waveId });

    await prisma.pickingWave.update({
      where: { id: waveId },
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
    });
  }

  /**
   * Get active waves
   */
  async getActiveWaves(warehouseId: number): Promise<Wave[]> {
    const waves = await prisma.pickingWave.findMany({
      where: {
        warehouse_id: warehouseId,
        status: { in: ['created', 'released', 'picking'] },
      },
      orderBy: { created_at: 'desc' },
    });

    return waves.map(w => ({
      id: w.id,
      name: w.name,
      warehouseId: w.warehouse_id,
      orders: JSON.parse(w.order_ids),
      status: w.status as any,
      createdAt: w.created_at,
      releasedAt: w.released_at || undefined,
      completedAt: w.completed_at || undefined,
    }));
  }
}

export default WavePickingManager;
