/**
 * Goods Receipt
 * Purpose: Receive inventory into warehouse
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class GoodsReceipt {
  async receiveGoods(
    purchaseOrderId: number,
    items: Array<{ productId: number; quantity: number }>,
    warehouseId: number
  ): Promise<void> {
    for (const item of items) {
      await prisma.inventoryItem.upsert({
        where: {
          product_id_warehouse_id: {
            product_id: item.productId,
            warehouse_id: warehouseId,
          },
        },
        create: {
          product_id: item.productId,
          warehouse_id: warehouseId,
          quantity_on_hand: item.quantity,
          quantity_available: item.quantity,
        },
        update: {
          quantity_on_hand: { increment: item.quantity },
          quantity_available: { increment: item.quantity },
        },
      });
    }

    await prisma.goodsReceipt.create({
      data: {
        purchase_order_id: purchaseOrderId,
        warehouse_id: warehouseId,
        items: JSON.stringify(items),
        received_at: new Date(),
      },
    });
  }
}

export default GoodsReceipt;
