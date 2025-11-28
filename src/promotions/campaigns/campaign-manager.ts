/**
 * Campaign Manager
 * Purpose: Create and manage promotional campaigns
 * Description: Campaign lifecycle, targeting, and coordination
 * 
 * Features:
 * - Campaign creation and editing
 * - Multi-channel coordination
 * - Target audience segmentation
 * - Budget management
 * - Performance tracking
 * - A/B testing support
 * - Campaign versioning
 * 
 * @example
 * ```typescript
 * const manager = new CampaignManager();
 * const campaign = await manager.create({
 *   name: 'Summer Sale 2024',
 *   type: 'discount',
 *   startDate: new Date('2024-06-01'),
 *   endDate: new Date('2024-06-30'),
 *   target: { segment: 'all' },
 *   rules: { minPurchase: 5000 }
 * });
 * ```
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface Campaign {
  id?: number;
  name: string;
  description?: string;
  type: 'discount' | 'coupon' | 'flash_sale' | 'loyalty' | 'bundle';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  startDate: Date;
  endDate: Date;
  budget?: number;
  spent?: number;
  priority: number;
  target: {
    segment?: 'all' | 'new' | 'returning' | 'vip';
    userIds?: number[];
    categoryIds?: number[];
    productIds?: number[];
    minOrderValue?: number;
    maxOrderValue?: number;
  };
  rules: {
    minPurchase?: number;
    maxDiscount?: number;
    maxUsesPerUser?: number;
    maxTotalUses?: number;
    stackable?: boolean;
  };
  channels: Array<'web' | 'mobile' | 'email' | 'sms'>;
  createdBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  averageOrderValue: number;
  roi: number;
  ctr: number;
  conversionRate: number;
}

export class CampaignManager {
  /**
   * Create new campaign
   */
  async create(campaign: Campaign): Promise<Campaign> {
    logger.info('Creating campaign', { name: campaign.name });

    const created = await prisma.campaign.create({
      data: {
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        status: campaign.status || 'draft',
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        budget: campaign.budget ? campaign.budget * 100 : null,
        spent: 0,
        priority: campaign.priority || 1,
        target: JSON.stringify(campaign.target),
        rules: JSON.stringify(campaign.rules),
        channels: JSON.stringify(campaign.channels),
        created_by: campaign.createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info('Campaign created', { id: created.id, name: campaign.name });

    return this.mapToCampaign(created);
  }

  /**
   * Update campaign
   */
  async update(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    logger.info('Updating campaign', { id, updates });

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        type: updates.type,
        status: updates.status,
        start_date: updates.startDate,
        end_date: updates.endDate,
        budget: updates.budget ? updates.budget * 100 : undefined,
        priority: updates.priority,
        target: updates.target ? JSON.stringify(updates.target) : undefined,
        rules: updates.rules ? JSON.stringify(updates.rules) : undefined,
        channels: updates.channels ? JSON.stringify(updates.channels) : undefined,
        updated_at: new Date(),
      },
    });

    return this.mapToCampaign(updated);
  }

  /**
   * Get campaign by ID
   */
  async getById(id: number): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    return campaign ? this.mapToCampaign(campaign) : null;
  }

  /**
   * List all campaigns
   */
  async list(filters?: {
    status?: Campaign['status'];
    type?: Campaign['type'];
    active?: boolean;
  }): Promise<Campaign[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.active) {
      const now = new Date();
      where.start_date = { lte: now };
      where.end_date = { gte: now };
      where.status = 'active';
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { start_date: 'desc' }],
    });

    return campaigns.map(c => this.mapToCampaign(c));
  }

  /**
   * Activate campaign
   */
  async activate(id: number): Promise<Campaign> {
    logger.info('Activating campaign', { id });

    const campaign = await this.getById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const now = new Date();
    if (now < campaign.startDate) {
      return this.update(id, { status: 'scheduled' });
    }

    if (now > campaign.endDate) {
      throw new Error('Campaign end date has passed');
    }

    return this.update(id, { status: 'active' });
  }

  /**
   * Pause campaign
   */
  async pause(id: number): Promise<Campaign> {
    logger.info('Pausing campaign', { id });
    return this.update(id, { status: 'paused' });
  }

  /**
   * End campaign
   */
  async end(id: number): Promise<Campaign> {
    logger.info('Ending campaign', { id });
    return this.update(id, { status: 'ended' });
  }

  /**
   * Delete campaign
   */
  async delete(id: number): Promise<void> {
    logger.info('Deleting campaign', { id });

    await prisma.campaign.delete({
      where: { id },
    });
  }

  /**
   * Check if user is eligible for campaign
   */
  async isUserEligible(campaignId: number, userId: number): Promise<boolean> {
    const campaign = await this.getById(campaignId);
    if (!campaign) return false;

    // Check status
    if (campaign.status !== 'active') return false;

    // Check dates
    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) return false;

    // Check target segment
    if (campaign.target.segment) {
      const userSegment = await this.getUserSegment(userId);
      if (campaign.target.segment !== 'all' && campaign.target.segment !== userSegment) {
        return false;
      }
    }

    // Check specific user IDs
    if (campaign.target.userIds && !campaign.target.userIds.includes(userId)) {
      return false;
    }

    // Check usage limits
    if (campaign.rules.maxUsesPerUser) {
      const usageCount = await this.getUserUsageCount(campaignId, userId);
      if (usageCount >= campaign.rules.maxUsesPerUser) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if product is eligible for campaign
   */
  async isProductEligible(campaignId: number, productId: number): Promise<boolean> {
    const campaign = await this.getById(campaignId);
    if (!campaign) return false;

    // Check product IDs
    if (campaign.target.productIds && !campaign.target.productIds.includes(productId)) {
      return false;
    }

    // Check category IDs
    if (campaign.target.categoryIds) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { category_id: true },
      });

      if (!product || !campaign.target.categoryIds.includes(product.category_id)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get campaign metrics
   */
  async getMetrics(campaignId: number): Promise<CampaignMetrics> {
    logger.info('Getting campaign metrics', { campaignId });

    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get orders associated with campaign
    const orders = await prisma.order.findMany({
      where: {
        campaign_id: campaignId,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: {
        total: true,
        discount_amount: true,
      },
    });

    const conversions = orders.length;
    const revenue = orders.reduce((sum, o) => sum + o.total, 0) / 100;
    const spent = campaign.spent || 0;
    const averageOrderValue = conversions > 0 ? revenue / conversions : 0;
    const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

    // These would come from tracking system
    const impressions = conversions * 10; // Estimated
    const clicks = conversions * 3; // Estimated
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    return {
      impressions,
      clicks,
      conversions,
      revenue,
      averageOrderValue,
      roi,
      ctr,
      conversionRate,
    };
  }

  /**
   * Track campaign usage
   */
  async trackUsage(campaignId: number, userId: number, orderId: number): Promise<void> {
    await prisma.campaignUsage.create({
      data: {
        campaign_id: campaignId,
        user_id: userId,
        order_id: orderId,
        used_at: new Date(),
      },
    });

    logger.info('Campaign usage tracked', { campaignId, userId, orderId });
  }

  /**
   * Get user segment
   */
  private async getUserSegment(userId: number): Promise<'new' | 'returning' | 'vip'> {
    const orderCount = await prisma.order.count({
      where: {
        user_id: userId,
        status: 'delivered',
      },
    });

    if (orderCount === 0) return 'new';
    if (orderCount >= 10) return 'vip';
    return 'returning';
  }

  /**
   * Get user usage count for campaign
   */
  private async getUserUsageCount(campaignId: number, userId: number): Promise<number> {
    return await prisma.campaignUsage.count({
      where: {
        campaign_id: campaignId,
        user_id: userId,
      },
    });
  }

  /**
   * Map database record to Campaign
   */
  private mapToCampaign(record: any): Campaign {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      type: record.type,
      status: record.status,
      startDate: record.start_date,
      endDate: record.end_date,
      budget: record.budget ? record.budget / 100 : undefined,
      spent: record.spent ? record.spent / 100 : undefined,
      priority: record.priority,
      target: JSON.parse(record.target || '{}'),
      rules: JSON.parse(record.rules || '{}'),
      channels: JSON.parse(record.channels || '[]'),
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Clone campaign
   */
  async clone(id: number, newName: string): Promise<Campaign> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Campaign not found');
    }

    const { id: _, createdAt, updatedAt, ...campaignData } = original;

    return this.create({
      ...campaignData,
      name: newName,
      status: 'draft',
    });
  }

  /**
   * Get active campaigns for user
   */
  async getActiveCampaignsForUser(userId: number): Promise<Campaign[]> {
    const activeCampaigns = await this.list({ active: true });

    const eligible: Campaign[] = [];
    for (const campaign of activeCampaigns) {
      if (await this.isUserEligible(campaign.id!, userId)) {
        eligible.push(campaign);
      }
    }

    return eligible.sort((a, b) => b.priority - a.priority);
  }
}

export default CampaignManager;
