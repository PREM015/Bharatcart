/**
 * Transfer Orders
 * Purpose: Transfer inventory between warehouses
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class TransferOrderManager {
  async createTransfer(
    productId: number,
    fromWarehouse: number,
    toWarehouse: number,
    quantity: number
  ): Promise<number> {
    const transfer = await prisma.transferOrder.create({
      data: {
        product_id: productId,
        from_warehouse_id: fromWarehouse,
        to_warehouse_id: toWarehouse,
        quantity,
        status: 'pending',
        created_at: new Date(),
      },
    });

    return transfer.id;
  }

  async completeTransfer(transferId: number): Promise<void> {
    const transfer = await prisma.transferOrder.findUnique({
      where: { id: transferId },
    });

    if (!transfer) return;

    // Deduct from source
    await prisma.inventoryItem.updateMany({
      where: {
        product_id: transfer.product_id,
        warehouse_id: transfer.from_warehouse_id,
      },
      data: {
        quantity_on_hand: { decrement: transfer.quantity },
        quantity_available: { decrement: transfer.quantity },
      },
    });

    // Add to destination
    await prisma.inventoryItem.updateMany({
      where: {
        product_id: transfer.product_id,
        warehouse_id: transfer.to_warehouse_id,
      },
      data: {
        quantity_on_hand: { increment: transfer.quantity },
        quantity_available: { increment: transfer.quantity },
      },
    });

    await prisma.transferOrder.update({
      where: { id: transferId },
      data: { status: 'completed', completed_at: new Date() },
    });
  }
}

export default TransferOrderManager;
