/**
 * Rewards Catalog
 * Purpose: Manage redeemable rewards
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface Reward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'product' | 'shipping';
  value: number;
  stock?: number;
  isActive: boolean;
}

export class RewardsCatalog {
  /**
   * Get all rewards
   */
  async getAll(): Promise<Reward[]> {
    const rewards = await prisma.reward.findMany({
      where: { is_active: true },
      orderBy: { points_cost: 'asc' },
    });

    return rewards.map(r => this.mapToReward(r));
  }

  /**
   * Get reward by ID
   */
  async getById(id: number): Promise<Reward | null> {
    const reward = await prisma.reward.findUnique({
      where: { id },
    });

    return reward ? this.mapToReward(reward) : null;
  }

  /**
   * Check if user can afford reward
   */
  async canAfford(userId: number, rewardId: number): Promise<boolean> {
    const [reward, userPoints] = await Promise.all([
      this.getById(rewardId),
      this.getUserPoints(userId),
    ]);

    if (!reward) return false;
    return userPoints >= reward.pointsCost;
  }

  /**
   * Redeem reward
   */
  async redeem(userId: number, rewardId: number): Promise<boolean> {
    const canAfford = await this.canAfford(userId, rewardId);
    if (!canAfford) return false;

    const reward = await this.getById(rewardId);
    if (!reward) return false;

    // Deduct points (handled by PointsEngine)
    logger.info('Reward redeemed', { userId, rewardId, points: reward.pointsCost });

    return true;
  }

  private async getUserPoints(userId: number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyalty_points: true },
    });

    return user?.loyalty_points || 0;
  }

  private mapToReward(record: any): Reward {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      pointsCost: record.points_cost,
      type: record.type,
      value: record.value,
      stock: record.stock,
      isActive: record.is_active,
    };
  }
}

export default RewardsCatalog;
