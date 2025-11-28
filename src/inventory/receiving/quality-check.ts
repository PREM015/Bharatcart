/**
 * Quality Check
 * Purpose: Perform quality checks on received goods
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class QualityCheck {
  async performCheck(
    receiptId: number,
    results: Array<{ productId: number; passed: boolean; notes?: string }>
  ): Promise<void> {
    for (const result of results) {
      await prisma.qualityCheckResult.create({
        data: {
          receipt_id: receiptId,
          product_id: result.productId,
          passed: result.passed,
          notes: result.notes,
          checked_at: new Date(),
        },
      });

      if (!result.passed) {
        // Create quarantine record
        await prisma.quarantineItem.create({
          data: {
            product_id: result.productId,
            receipt_id: receiptId,
            reason: result.notes || 'Failed quality check',
            created_at: new Date(),
          },
        });
      }
    }
  }
}

export default QualityCheck;
