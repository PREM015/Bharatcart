/**
 * Campaign Analytics
 * Purpose: Deep analytics for campaign performance
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CampaignManager } from './campaign-manager';

export interface CampaignAnalytics {
  campaignId: number;
  campaignName: string;
  period: { start: Date; end: Date };
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    costs: number;
    profit: number;
  };
  metrics: {
    ctr: number;
    conversionRate: number;
    averageOrderValue: number;
    roi: number;
    roas: number;
    cpa: number;
  };
  topProducts: Array<{
    productId: number;
    productName: string;
    orders: number;
    revenue: number;
  }>;
  customerSegments: Array<{
    segment: string;
    customers: number;
    revenue: number;
    averageOrderValue: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    conversions: number;
    revenue: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    conversions: number;
    revenue: number;
  }>;
}

export class CampaignAnalyticsEngine {
  private manager: CampaignManager;

  constructor() {
    this.manager = new CampaignManager();
  }

  async analyze(campaignId: number): Promise<CampaignAnalytics> {
    logger.info('Analyzing campaign', { campaignId });

    const campaign = await this.manager.getById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const [
      performance,
      topProducts,
      customerSegments,
      hourlyBreakdown,
      dailyBreakdown,
    ] = await Promise.all([
      this.getPerformance(campaignId),
      this.getTopProducts(campaignId),
      this.getCustomerSegments(campaignId),
      this.getHourlyBreakdown(campaignId),
      this.getDailyBreakdown(campaignId),
    ]);

    const metrics = this.calculateMetrics(performance);

    return {
      campaignId,
      campaignName: campaign.name,
      period: { start: campaign.startDate, end: campaign.endDate },
      performance,
      metrics,
      topProducts,
      customerSegments,
      hourlyBreakdown,
      dailyBreakdown,
    };
  }

  private async getPerformance(campaignId: number) {
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
    const discounts = orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0) / 100;

    return {
      impressions: conversions * 10,
      clicks: conversions * 3,
      conversions,
      revenue,
      costs: discounts,
      profit: revenue - discounts,
    };
  }

  private calculateMetrics(performance: any) {
    const ctr = performance.impressions > 0
      ? (performance.clicks / performance.impressions) * 100
      : 0;

    const conversionRate = performance.clicks > 0
      ? (performance.conversions / performance.clicks) * 100
      : 0;

    const averageOrderValue = performance.conversions > 0
      ? performance.revenue / performance.conversions
      : 0;

    const roi = performance.costs > 0
      ? ((performance.profit / performance.costs) * 100)
      : 0;

    const roas = performance.costs > 0
      ? performance.revenue / performance.costs
      : 0;

    const cpa = performance.conversions > 0
      ? performance.costs / performance.conversions
      : 0;

    return {
      ctr,
      conversionRate,
      averageOrderValue,
      roi,
      roas,
      cpa,
    };
  }

  private async getTopProducts(campaignId: number) {
    const orderItems = await prisma.orderItem.groupBy({
      by: ['product_id'],
      where: {
        order: {
          campaign_id: campaignId,
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      _count: { id: true },
      _sum: { price: true, quantity: true },
      orderBy: { _sum: { price: 'desc' } },
      take: 10,
    });

    const productIds = orderItems.map(item => item.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map(p => [p.id, p.name]));

    return orderItems.map(item => ({
      productId: item.product_id,
      productName: productMap.get(item.product_id) || 'Unknown',
      orders: item._count.id,
      revenue: (item._sum.price || 0) / 100,
    }));
  }

  private async getCustomerSegments(campaignId: number) {
    // Simplified - would analyze actual customer segments
    return [
      { segment: 'New Customers', customers: 0, revenue: 0, averageOrderValue: 0 },
      { segment: 'Returning', customers: 0, revenue: 0, averageOrderValue: 0 },
      { segment: 'VIP', customers: 0, revenue: 0, averageOrderValue: 0 },
    ];
  }

  private async getHourlyBreakdown(campaignId: number) {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      conversions: 0,
      revenue: 0,
    }));

    // Would aggregate actual data by hour
    return hours;
  }

  private async getDailyBreakdown(campaignId: number) {
    const campaign = await this.manager.getById(campaignId);
    if (!campaign) return [];

    const days: Array<{ date: string; conversions: number; revenue: number }> = [];
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        date: d.toISOString().split('T')[0],
        conversions: 0,
        revenue: 0,
      });
    }

    return days;
  }

  async compareCompains(campaignIds: number[]): Promise<any> {
    const analytics = await Promise.all(
      campaignIds.map(id => this.analyze(id))
    );

    return {
      campaigns: analytics,
      comparison: {
        bestROI: analytics.reduce((best, curr) =>
          curr.metrics.roi > best.metrics.roi ? curr : best
        ),
        bestConversionRate: analytics.reduce((best, curr) =>
          curr.metrics.conversionRate > best.metrics.conversionRate ? curr : best
        ),
        highestRevenue: analytics.reduce((best, curr) =>
          curr.performance.revenue > best.performance.revenue ? curr : best
        ),
      },
    };
  }
}

export default CampaignAnalyticsEngine;
