/**
 * Loyalty Tier Manager
 * Purpose: Manage customer loyalty tiers
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface LoyaltyTier {
  id: number;
  name: string;
  minSpend: number;
  maxSpend?: number;
  pointsMultiplier: number;
  benefits: string[];
}

export class TierManager {
  private tiers: LoyaltyTier[] = [
    {
      id: 1,
      name: 'Bronze',
      minSpend: 0,
      maxSpend: 499,
      pointsMultiplier: 1,
      benefits: ['Earn 1 point per $1'],
    },
    {
      id: 2,
      name: 'Silver',
      minSpend: 500,
      maxSpend: 1999,
      pointsMultiplier: 1.25,
      benefits: ['Earn 1.25 points per $1', 'Free shipping'],
    },
    {
      id: 3,
      name: 'Gold',
      minSpend: 2000,
      maxSpend: 4999,
      pointsMultiplier: 1.5,
      benefits: ['Earn 1.5 points per $1', 'Free shipping', 'Early access'],
    },
    {
      id: 4,
      name: 'Platinum',
      minSpend: 5000,
      pointsMultiplier: 2,
      benefits: [
        'Earn 2 points per $1',
        'Free shipping',
        'Early access',
        'Exclusive deals',
        'Birthday gift',
      ],
    },
  ];

  /**
   * Get user's tier
   */
  async getUserTier(userId: number): Promise<LoyaltyTier> {
    const totalSpend = await this.getTotalSpend(userId);
    return this.getTierBySpend(totalSpend);
  }

  /**
   * Get tier by spend amount
   */
  getTierBySpend(totalSpend: number): LoyaltyTier {
    return (
      this.tiers.find(
        tier =>
          totalSpend >= tier.minSpend &&
          (!tier.maxSpend || totalSpend <= tier.maxSpend)
      ) || this.tiers[0]
    );
  }

  /**
   * Calculate total user spend
   */
  private async getTotalSpend(userId: number): Promise<number> {
    const result = await prisma.order.aggregate({
      where: {
        user_id: userId,
        status: 'delivered',
      },
      _sum: { total: true },
    });

    return (result._sum.total || 0) / 100;
  }

  /**
   * Get all tiers
   */
  getAllTiers(): LoyaltyTier[] {
    return this.tiers;
  }

  /**
   * Get next tier info
   */
  async getNextTierInfo(userId: number): Promise<{
    currentTier: LoyaltyTier;
    nextTier: LoyaltyTier | null;
    spendToNext: number;
  }> {
    const totalSpend = await this.getTotalSpend(userId);
    const currentTier = this.getTierBySpend(totalSpend);
    
    const nextTier = this.tiers.find(t => t.minSpend > totalSpend) || null;
    const spendToNext = nextTier ? nextTier.minSpend - totalSpend : 0;

    return { currentTier, nextTier, spendToNext };
  }
}

export default TierManager;
