/**
 * Sales Forecasting Engine
 * Purpose: Forecast revenue and pipeline performance
 * Description: Revenue forecasting, quota tracking, predictive analytics
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface Forecast {
  period: 'month' | 'quarter' | 'year';
  start_date: Date;
  end_date: Date;
  forecasted_revenue: number;
  weighted_pipeline: number;
  best_case: number;
  worst_case: number;
  committed: number;
  quota?: number;
  quota_attainment?: number;
  confidence: number;
}

export interface ForecastByRep {
  user_id: number;
  user_name: string;
  forecasted_revenue: number;
  weighted_pipeline: number;
  deals_closing: number;
  quota?: number;
  quota_attainment?: number;
}

export class SalesForecastingEngine {
  /**
   * Generate forecast for period
   */
  async generateForecast(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<Forecast> {
    logger.info('Generating sales forecast', {
      start_date: startDate,
      end_date: endDate,
      user_id: userId,
    });

    const where: any = {
      status: 'open',
      expected_close_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userId) {
      where.owner_id = userId;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: true,
      },
    });

    // Calculate forecast metrics
    const forecasted = this.calculateWeightedPipeline(deals);
    const bestCase = this.calculateBestCase(deals);
    const worstCase = this.calculateWorstCase(deals);
    const committed = this.calculateCommitted(deals);

    // Get quota for period
    const quota = await this.getQuota(startDate, endDate, userId);

    const forecast: Forecast = {
      period: this.determinePeriod(startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      forecasted_revenue: forecasted,
      weighted_pipeline: forecasted,
      best_case: bestCase,
      worst_case: worstCase,
      committed,
      quota,
      quota_attainment: quota ? (committed / quota) * 100 : undefined,
      confidence: this.calculateConfidence(deals),
    };

    return forecast;
  }

  /**
   * Calculate weighted pipeline value
   */
  private calculateWeightedPipeline(deals: any[]): number {
    return deals.reduce((sum, deal) => {
      const weightedValue = (deal.amount * deal.probability) / 100;
      return sum + weightedValue;
    }, 0);
  }

  /**
   * Calculate best case scenario (all deals close)
   */
  private calculateBestCase(deals: any[]): number {
    return deals.reduce((sum, deal) => sum + deal.amount, 0);
  }

  /**
   * Calculate worst case scenario (only high probability deals)
   */
  private calculateWorstCase(deals: any[]): number {
    return deals
      .filter(deal => deal.probability >= 80)
      .reduce((sum, deal) => sum + deal.amount, 0);
  }

  /**
   * Calculate committed revenue (high confidence deals)
   */
  private calculateCommitted(deals: any[]): number {
    return deals
      .filter(deal => deal.probability >= 90)
      .reduce((sum, deal) => sum + deal.amount, 0);
  }

  /**
   * Get quota for period
   */
  private async getQuota(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<number | undefined> {
    const where: any = {
      start_date: { lte: startDate },
      end_date: { gte: endDate },
    };

    if (userId) {
      where.user_id = userId;
    }

    const quota = await prisma.quota.findFirst({
      where,
    });

    return quota?.amount;
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(deals: any[]): number {
    if (deals.length === 0) {
      return 0;
    }

    // Confidence based on deal age, activity, and stage
    let totalConfidence = 0;

    for (const deal of deals) {
      let dealConfidence = deal.probability;

      // Adjust for deal age
      const ageMs = Date.now() - deal.created_at.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      if (ageDays > 90) {
        dealConfidence *= 0.8; // Reduce confidence for old deals
      } else if (ageDays < 7) {
        dealConfidence *= 0.9; // Reduce confidence for very new deals
      }

      totalConfidence += dealConfidence;
    }

    return Math.round(totalConfidence / deals.length);
  }

  /**
   * Determine forecast period
   */
  private determinePeriod(startDate: Date, endDate: Date): 'month' | 'quarter' | 'year' {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 31) return 'month';
    if (diffDays <= 92) return 'quarter';
    return 'year';
  }

  /**
   * Generate forecast by sales rep
   */
  async generateForecastByRep(
    startDate: Date,
    endDate: Date
  ): Promise<ForecastByRep[]> {
    logger.info('Generating forecast by rep', {
      start_date: startDate,
      end_date: endDate,
    });

    const salesReps = await prisma.user.findMany({
      where: {
        role: 'sales_rep',
        is_active: true,
      },
    });

    const forecasts: ForecastByRep[] = [];

    for (const rep of salesReps) {
      const deals = await prisma.deal.findMany({
        where: {
          owner_id: rep.id,
          status: 'open',
          expected_close_date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const forecast = await this.generateForecast(startDate, endDate, rep.id);

      forecasts.push({
        user_id: rep.id,
        user_name: `${rep.first_name} ${rep.last_name}`,
        forecasted_revenue: forecast.forecasted_revenue,
        weighted_pipeline: forecast.weighted_pipeline,
        deals_closing: deals.length,
        quota: forecast.quota,
        quota_attainment: forecast.quota_attainment,
      });
    }

    return forecasts.sort((a, b) => b.forecasted_revenue - a.forecasted_revenue);
  }

  /**
   * Predict deal close probability using ML
   */
  async predictCloseProbability(dealId: number): Promise<number> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        contact: true,
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Simple heuristic-based prediction
    // In production, use ML model (e.g., scikit-learn, TensorFlow)
    let probability = deal.probability;

    // Adjust based on deal age
    const ageMs = Date.now() - deal.created_at.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (ageDays > 90) {
      probability *= 0.7;
    } else if (ageDays > 60) {
      probability *= 0.85;
    }

    // Adjust based on activity
    const recentActivity = await prisma.contactActivity.count({
      where: {
        contact_id: deal.contact_id,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentActivity > 5) {
      probability *= 1.1;
    } else if (recentActivity === 0) {
      probability *= 0.8;
    }

    // Cap at 100
    return Math.min(Math.round(probability), 100);
  }

  /**
   * Get win rate by stage
   */
  async getWinRateByStage(pipelineId: string): Promise<any[]> {
    const stages = await prisma.dealStageHistory.findMany({
      where: {
        deal: {
          pipeline_id: pipelineId,
        },
      },
      include: {
        deal: true,
      },
    });

    const stageStats = new Map<string, { total: number; won: number }>();

    for (const stage of stages) {
      const stageId = stage.new_stage_id;
      const stats = stageStats.get(stageId) || { total: 0, won: 0 };

      stats.total++;
      if (stage.deal.status === 'won') {
        stats.won++;
      }

      stageStats.set(stageId, stats);
    }

    return Array.from(stageStats.entries()).map(([stageId, stats]) => ({
      stage_id: stageId,
      total_deals: stats.total,
      won_deals: stats.won,
      win_rate: stats.total > 0 ? (stats.won / stats.total) * 100 : 0,
    }));
  }

  /**
   * Get historical accuracy
   */
  async getForecastAccuracy(period: 'month' | 'quarter'): Promise<number> {
    // Compare forecasts vs actual revenue
    const periodMonths = period === 'quarter' ? 3 : 1;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const forecast = await this.generateForecast(startDate, new Date());

    const actualRevenue = await prisma.deal.aggregate({
      where: {
        status: 'won',
        won_at: {
          gte: startDate,
          lte: new Date(),
        },
      },
      _sum: {
        amount: true,
      },
    });

    const actual = actualRevenue._sum.amount || 0;
    const forecasted = forecast.forecasted_revenue;

    if (forecasted === 0) {
      return 0;
    }

    const accuracy = (1 - Math.abs(actual - forecasted) / forecasted) * 100;
    return Math.max(0, Math.round(accuracy));
  }
}

export default SalesForecastingEngine;
