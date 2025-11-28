/**
 * Smart Inventory Allocation
 * Purpose: Intelligently allocate inventory to orders
 * Description: Multi-warehouse allocation with proximity, stock levels, and cost optimization
 * 
 * Features:
 * - Proximity-based allocation
 * - Cost-optimized selection
 * - Stock level balancing
 * - Multi-warehouse support
 * - Priority handling
 * - Backorder management
 * 
 * Allocation Strategies:
 * - NEAREST: Closest warehouse to customer
 * - BALANCED: Distribute across warehouses evenly
 * - FIFO: First warehouse with stock
 * - COST_OPTIMIZED: Lowest shipping + handling cost
 * 
 * @example
 * ```typescript
 * const allocator = new SmartAllocator();
 * const allocation = await allocator.allocate({
 *   orderId: 12345,
 *   items: [{ productId: 1, quantity: 2 }],
 *   destination: { city: 'Mumbai', country: 'IN' },
 *   strategy: 'NEAREST'
 * });
 * ```
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AllocationRequest {
  orderId: number;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  destination: {
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  strategy?: 'NEAREST' | 'BALANCED' | 'FIFO' | 'COST_OPTIMIZED';
}

export interface AllocationResult {
  orderId: number;
  allocations: Array<{
    warehouseId: number;
    warehouseName: string;
    items: Array<{
      productId: number;
      quantity: number;
      allocated: number;
      backordered: number;
    }>;
    estimatedCost: number;
    distance?: number;
  }>;
  fullyAllocated: boolean;
  backorderedItems: Array<{
    productId: number;
    quantity: number;
  }>;
}

export class SmartAllocator {
  /**
   * Allocate inventory to order
   */
  async allocate(request: AllocationRequest): Promise<AllocationResult> {
    logger.info('Allocating inventory', {
      orderId: request.orderId,
      itemCount: request.items.length,
      strategy: request.strategy,
    });

    const strategy = request.strategy || 'NEAREST';
    
    // Get warehouses with stock
    const warehousesWithStock = await this.getWarehousesWithStock(request.items);

    if (warehousesWithStock.length === 0) {
      return this.createBackorderResult(request);
    }

    // Apply allocation strategy
    let allocations;
    switch (strategy) {
      case 'NEAREST':
        allocations = await this.allocateByProximity(request, warehousesWithStock);
        break;
      case 'BALANCED':
        allocations = await this.allocateBalanced(request, warehousesWithStock);
        break;
      case 'COST_OPTIMIZED':
        allocations = await this.allocateByCost(request, warehousesWithStock);
        break;
      default:
        allocations = await this.allocateFIFO(request, warehousesWithStock);
    }

    // Save allocations
    await this.saveAllocations(request.orderId, allocations);

    const fullyAllocated = this.checkFullyAllocated(request.items, allocations);
    const backorderedItems = this.getBackorderedItems(request.items, allocations);

    return {
      orderId: request.orderId,
      allocations,
      fullyAllocated,
      backorderedItems,
    };
  }

  /**
   * Get warehouses with available stock
   */
  private async getWarehousesWithStock(
    items: Array<{ productId: number; quantity: number }>
  ): Promise<any[]> {
    const productIds = items.map(i => i.productId);

    const warehouses = await prisma.warehouse.findMany({
      where: {
        is_active: true,
        inventoryItems: {
          some: {
            product_id: { in: productIds },
            quantity_available: { gt: 0 },
          },
        },
      },
      include: {
        inventoryItems: {
          where: {
            product_id: { in: productIds },
            quantity_available: { gt: 0 },
          },
        },
      },
    });

    return warehouses;
  }

  /**
   * Allocate by proximity (nearest warehouse)
   */
  private async allocateByProximity(
    request: AllocationRequest,
    warehouses: any[]
  ): Promise<AllocationResult['allocations']> {
    // Sort warehouses by distance to destination
    const withDistances = await Promise.all(
      warehouses.map(async (wh) => ({
        warehouse: wh,
        distance: await this.calculateDistance(wh, request.destination),
      }))
    );

    withDistances.sort((a, b) => a.distance - b.distance);

    return this.allocateFromWarehouses(
      request.items,
      withDistances.map(wd => wd.warehouse)
    );
  }

  /**
   * Allocate balanced across warehouses
   */
  private async allocateBalanced(
    request: AllocationRequest,
    warehouses: any[]
  ): Promise<AllocationResult['allocations']> {
    const allocations: AllocationResult['allocations'] = [];
    const remainingItems = new Map(
      request.items.map(item => [item.productId, item.quantity])
    );

    // Distribute evenly across warehouses
    for (const warehouse of warehouses) {
      const warehouseAllocation: any = {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        items: [],
        estimatedCost: 0,
      };

      for (const [productId, needed] of remainingItems) {
        if (needed <= 0) continue;

        const inventoryItem = warehouse.inventoryItems.find(
          (i: any) => i.product_id === productId
        );

        if (!inventoryItem) continue;

        const available = inventoryItem.quantity_available;
        const toAllocate = Math.min(Math.ceil(needed / warehouses.length), available);

        if (toAllocate > 0) {
          warehouseAllocation.items.push({
            productId,
            quantity: needed,
            allocated: toAllocate,
            backordered: 0,
          });

          remainingItems.set(productId, needed - toAllocate);
        }
      }

      if (warehouseAllocation.items.length > 0) {
        allocations.push(warehouseAllocation);
      }
    }

    return allocations;
  }

  /**
   * Allocate by cost (shipping + handling)
   */
  private async allocateByCost(
    request: AllocationRequest,
    warehouses: any[]
  ): Promise<AllocationResult['allocations']> {
    // Calculate costs for each warehouse
    const withCosts = await Promise.all(
      warehouses.map(async (wh) => ({
        warehouse: wh,
        cost: await this.calculateShippingCost(wh, request.destination),
      }))
    );

    withCosts.sort((a, b) => a.cost - b.cost);

    return this.allocateFromWarehouses(
      request.items,
      withCosts.map(wc => wc.warehouse)
    );
  }

  /**
   * Allocate FIFO (first warehouse with stock)
   */
  private async allocateFIFO(
    request: AllocationRequest,
    warehouses: any[]
  ): Promise<AllocationResult['allocations']> {
    return this.allocateFromWarehouses(request.items, warehouses);
  }

  /**
   * Helper: Allocate from ordered warehouse list
   */
  private allocateFromWarehouses(
    items: Array<{ productId: number; quantity: number }>,
    warehouses: any[]
  ): AllocationResult['allocations'] {
    const allocations: AllocationResult['allocations'] = [];
    const remainingItems = new Map(
      items.map(item => [item.productId, item.quantity])
    );

    for (const warehouse of warehouses) {
      const warehouseAllocation: any = {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        items: [],
        estimatedCost: 0,
      };

      for (const [productId, needed] of remainingItems) {
        if (needed <= 0) continue;

        const inventoryItem = warehouse.inventoryItems.find(
          (i: any) => i.product_id === productId
        );

        if (!inventoryItem) continue;

        const available = inventoryItem.quantity_available;
        const toAllocate = Math.min(needed, available);

        if (toAllocate > 0) {
          warehouseAllocation.items.push({
            productId,
            quantity: needed,
            allocated: toAllocate,
            backordered: needed - toAllocate,
          });

          remainingItems.set(productId, needed - toAllocate);
        }
      }

      if (warehouseAllocation.items.length > 0) {
        allocations.push(warehouseAllocation);
      }

      // Check if all items allocated
      if (Array.from(remainingItems.values()).every(q => q <= 0)) {
        break;
      }
    }

    return allocations;
  }

  /**
   * Calculate distance between warehouse and destination
   */
  private async calculateDistance(warehouse: any, destination: any): Promise<number> {
    // Simplified - would use geocoding service
    const warehouseCity = warehouse.city || '';
    const destCity = destination.city || '';

    if (warehouseCity.toLowerCase() === destCity.toLowerCase()) {
      return 0;
    }

    // Rough estimate based on state/country
    if (warehouse.country !== destination.country) {
      return 5000; // km
    }

    return 500; // km
  }

  /**
   * Calculate shipping cost
   */
  private async calculateShippingCost(warehouse: any, destination: any): Promise<number> {
    const distance = await this.calculateDistance(warehouse, destination);
    const baseCost = warehouse.handling_cost || 5;
    const shippingCost = distance * 0.1; // $0.10 per km

    return baseCost + shippingCost;
  }

  /**
   * Save allocations to database
   */
  private async saveAllocations(
    orderId: number,
    allocations: AllocationResult['allocations']
  ): Promise<void> {
    for (const allocation of allocations) {
      for (const item of allocation.items) {
        await prisma.inventoryAllocation.create({
          data: {
            order_id: orderId,
            warehouse_id: allocation.warehouseId,
            product_id: item.productId,
            quantity_allocated: item.allocated,
            allocated_at: new Date(),
          },
        });

        // Reserve inventory
        await prisma.inventoryItem.updateMany({
          where: {
            warehouse_id: allocation.warehouseId,
            product_id: item.productId,
          },
          data: {
            quantity_reserved: { increment: item.allocated },
            quantity_available: { decrement: item.allocated },
          },
        });
      }
    }

    logger.info('Allocations saved', { orderId, warehouseCount: allocations.length });
  }

  /**
   * Check if order is fully allocated
   */
  private checkFullyAllocated(
    requestedItems: Array<{ productId: number; quantity: number }>,
    allocations: AllocationResult['allocations']
  ): boolean {
    const allocatedMap = new Map<number, number>();

    for (const allocation of allocations) {
      for (const item of allocation.items) {
        const current = allocatedMap.get(item.productId) || 0;
        allocatedMap.set(item.productId, current + item.allocated);
      }
    }

    return requestedItems.every(
      item => (allocatedMap.get(item.productId) || 0) >= item.quantity
    );
  }

  /**
   * Get backordered items
   */
  private getBackorderedItems(
    requestedItems: Array<{ productId: number; quantity: number }>,
    allocations: AllocationResult['allocations']
  ): Array<{ productId: number; quantity: number }> {
    const allocatedMap = new Map<number, number>();

    for (const allocation of allocations) {
      for (const item of allocation.items) {
        const current = allocatedMap.get(item.productId) || 0;
        allocatedMap.set(item.productId, current + item.allocated);
      }
    }

    return requestedItems
      .map(item => ({
        productId: item.productId,
        quantity: item.quantity - (allocatedMap.get(item.productId) || 0),
      }))
      .filter(item => item.quantity > 0);
  }

  /**
   * Create backorder result when no stock available
   */
  private createBackorderResult(request: AllocationRequest): AllocationResult {
    return {
      orderId: request.orderId,
      allocations: [],
      fullyAllocated: false,
      backorderedItems: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * Release allocation (e.g., when order is cancelled)
   */
  async releaseAllocation(orderId: number): Promise<void> {
    logger.info('Releasing allocations', { orderId });

    const allocations = await prisma.inventoryAllocation.findMany({
      where: { order_id: orderId },
    });

    for (const allocation of allocations) {
      await prisma.inventoryItem.updateMany({
        where: {
          warehouse_id: allocation.warehouse_id,
          product_id: allocation.product_id,
        },
        data: {
          quantity_reserved: { decrement: allocation.quantity_allocated },
          quantity_available: { increment: allocation.quantity_allocated },
        },
      });
    }

    await prisma.inventoryAllocation.deleteMany({
      where: { order_id: orderId },
    });
  }

  /**
   * Get allocation details for order
   */
  async getAllocationDetails(orderId: number): Promise<any> {
    const allocations = await prisma.inventoryAllocation.findMany({
      where: { order_id: orderId },
      include: {
        warehouse: {
          select: { id: true, name: true, city: true },
        },
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    return allocations;
  }
}

export default SmartAllocator;
