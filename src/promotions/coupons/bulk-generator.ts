/**
 * Bulk Coupon Generator
 * Purpose: Generate thousands of unique coupon codes
 * Description: Batch generation with prefix, patterns, and uniqueness
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface BulkGenerateOptions {
  count: number;
  prefix?: string;
  suffix?: string;
  length?: number;
  pattern?: 'alphanumeric' | 'numeric' | 'alphabetic';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiresAt?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  minOrderValue?: number;
}

export class BulkCouponGenerator {
  /**
   * Generate bulk coupons
   */
  async generate(options: BulkGenerateOptions): Promise<string[]> {
    logger.info('Generating bulk coupons', { count: options.count });

    const codes: string[] = [];
    const uniqueCodes = new Set<string>();

    while (uniqueCodes.size < options.count) {
      const code = this.generateCode(options);
      uniqueCodes.add(code);
    }

    codes.push(...Array.from(uniqueCodes));

    // Batch insert
    await this.saveCoupons(codes, options);

    logger.info('Bulk coupons generated', { count: codes.length });
    return codes;
  }

  /**
   * Generate single code
   */
  private generateCode(options: BulkGenerateOptions): string {
    const length = options.length || 8;
    let chars: string;

    switch (options.pattern) {
      case 'numeric':
        chars = '0123456789';
        break;
      case 'alphabetic':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        break;
      default:
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (options.prefix) {
      code = options.prefix + code;
    }

    if (options.suffix) {
      code = code + options.suffix;
    }

    return code;
  }

  /**
   * Save coupons to database
   */
  private async saveCoupons(codes: string[], options: BulkGenerateOptions): Promise<void> {
    const coupons = codes.map(code => ({
      code,
      discount_type: options.discountType,
      discount_value: options.discountType === 'percentage'
        ? options.discountValue
        : options.discountValue * 100,
      expires_at: options.expiresAt,
      max_uses: options.maxUses,
      max_uses_per_user: options.maxUsesPerUser,
      min_order_value: options.minOrderValue ? options.minOrderValue * 100 : null,
      is_active: true,
      created_at: new Date(),
    }));

    // Batch insert in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < coupons.length; i += chunkSize) {
      const chunk = coupons.slice(i, i + chunkSize);
      await prisma.coupon.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Generate with custom pattern
   */
  async generateWithPattern(
    count: number,
    pattern: string,
    options: Omit<BulkGenerateOptions, 'count' | 'pattern'>
  ): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code = pattern;
      code = code.replace(/{n}/g, () => Math.floor(Math.random() * 10).toString());
      code = code.replace(/{a}/g, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)));
      code = code.replace(/{seq}/g, () => String(i + 1).padStart(5, '0'));

      codes.push(code);
    }

    await this.saveCoupons(codes, { ...options, count, pattern: 'alphanumeric' });
    return codes;
  }

  /**
   * Generate referral codes
   */
  async generateReferralCodes(userIds: number[]): Promise<Map<number, string>> {
    const codes = new Map<number, string>();

    for (const userId of userIds) {
      const code = `REF${userId}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      codes.set(userId, code);
    }

    await prisma.coupon.createMany({
      data: Array.from(codes.entries()).map(([userId, code]) => ({
        code,
        discount_type: 'percentage',
        discount_value: 10,
        max_uses_per_user: 1,
        is_active: true,
        created_by: userId,
        created_at: new Date(),
      })),
    });

    return codes;
  }

  /**
   * Export codes to CSV
   */
  async exportToCSV(codes: string[]): Promise<string> {
    const header = 'Code,Created At
';
    const rows = codes.map(code => `${code},${new Date().toISOString()}`).join('
');
    return header + rows;
  }
}

export default BulkCouponGenerator;
