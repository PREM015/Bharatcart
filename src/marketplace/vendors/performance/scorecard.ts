/**
 * Vendor Performance Scorecard
 * Purpose: Visual performance dashboard for vendors
 * Description: Badge system, tier management, performance alerts
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { VendorPerformanceMetrics } from './metrics';

export interface PerformanceBadge {
  name: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  criteria: string;
  earned_at?: Date;
}

export interface VendorTier {
  name: 'starter' | 'rising' | 'established' | 'elite';
  min_score: number;
  benefits: string[];
  commission_discount: number;
}

export interface Scorecard {
  vendor_id: number;
  current_tier: VendorTier;
  overall_score: number;
  badges: PerformanceBadge[];
  strengths: string[];
  improvements: string[];
  next_tier_requirements: {
    tier: string;
    score_needed: number;
    score_gap: number;
  } | null;
}

export class PerformanceScorecard {
  private metricsService: VendorPerformanceMetrics;

  constructor() {
    this.metricsService = new VendorPerformanceMetrics();
  }

  /**
   * Generate vendor scorecard
   */
  async generateScorecard(vendorId: number): Promise<Scorecard> {
    logger.info('Generating scorecard', { vendor_id: vendorId });

    // Get current metrics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const metrics = await this.metricsService.calculateMetrics(
      vendorId,
      startDate,
      endDate
    );

    // Determine tier
    const currentTier = this.determineTier(metrics.overall_score);

    // Get badges
    const badges = await this.evaluateBadges(vendorId, metrics);

    // Identify strengths and improvements
    const strengths = this.identifyStrengths(metrics);
    const improvements = this.identifyImprovements(metrics);

    // Calculate next tier requirements
    const nextTierReq = this.calculateNextTierRequirements(
      metrics.overall_score,
      currentTier
    );

    const scorecard: Scorecard = {
      vendor_id: vendorId,
      current_tier: currentTier,
      overall_score: metrics.overall_score,
      badges,
      strengths,
      improvements,
      next_tier_requirements: nextTierReq,
    };

    // Save scorecard
    await this.saveScorecard(scorecard);

    return scorecard;
  }

  /**
   * Determine vendor tier based on score
   */
  private determineTier(score: number): VendorTier {
    const tiers: VendorTier[] = [
      {
        name: 'elite',
        min_score: 90,
        benefits: [
          'Featured placement',
          'Priority support',
          '5% commission discount',
          'Early access to features',
        ],
        commission_discount: 5,
      },
      {
        name: 'established',
        min_score: 75,
        benefits: [
          'Enhanced visibility',
          'Priority support',
          '3% commission discount',
        ],
        commission_discount: 3,
      },
      {
        name: 'rising',
        min_score: 60,
        benefits: ['Standard support', '1% commission discount'],
        commission_discount: 1,
      },
      {
        name: 'starter',
        min_score: 0,
        benefits: ['Standard support', 'Learning resources'],
        commission_discount: 0,
      },
    ];

    return (
      tiers.find(tier => score >= tier.min_score) || tiers[tiers.length - 1]
    );
  }

  /**
   * Evaluate and award badges
   */
  private async evaluateBadges(
    vendorId: number,
    metrics: any
  ): Promise<PerformanceBadge[]> {
    const availableBadges: PerformanceBadge[] = [
      {
        name: 'Fast Shipper',
        level: 'gold',
        icon: '🚀',
        criteria: 'Average processing time < 24 hours',
      },
      {
        name: 'Customer Favorite',
        level: 'platinum',
        icon: '⭐',
        criteria: 'Average rating >= 4.8',
      },
      {
        name: 'On-Time Pro',
        level: 'gold',
        icon: '⏰',
        criteria: 'On-time delivery rate >= 95%',
      },
      {
        name: 'Top Seller',
        level: 'platinum',
        icon: '💎',
        criteria: 'Monthly revenue > $10,000',
      },
      {
        name: 'Responsive Seller',
        level: 'silver',
        icon: '💬',
        criteria: 'Review response rate >= 90%',
      },
      {
        name: 'Quality Champion',
        level: 'gold',
        icon: '🏆',
        criteria: 'Return rate < 2%',
      },
    ];

    const earnedBadges: PerformanceBadge[] = [];

    // Fast Shipper
    if (metrics.fulfillment.average_processing_time < 24) {
      const badge = availableBadges.find(b => b.name === 'Fast Shipper')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    // Customer Favorite
    if (metrics.customer_satisfaction.average_rating >= 4.8) {
      const badge = availableBadges.find(b => b.name === 'Customer Favorite')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    // On-Time Pro
    if (metrics.fulfillment.on_time_delivery_rate >= 95) {
      const badge = availableBadges.find(b => b.name === 'On-Time Pro')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    // Top Seller
    if (metrics.sales.total_revenue >= 10000) {
      const badge = availableBadges.find(b => b.name === 'Top Seller')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    // Responsive Seller
    if (metrics.customer_satisfaction.response_rate >= 90) {
      const badge = availableBadges.find(b => b.name === 'Responsive Seller')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    // Quality Champion
    if (metrics.fulfillment.return_rate < 2) {
      const badge = availableBadges.find(b => b.name === 'Quality Champion')!;
      badge.earned_at = new Date();
      earnedBadges.push(badge);
    }

    return earnedBadges;
  }

  /**
   * Identify vendor strengths
   */
  private identifyStrengths(metrics: any): string[] {
    const strengths: string[] = [];

    if (metrics.fulfillment.on_time_delivery_rate >= 95) {
      strengths.push('Excellent on-time delivery performance');
    }

    if (metrics.customer_satisfaction.average_rating >= 4.5) {
      strengths.push('High customer satisfaction ratings');
    }

    if (metrics.fulfillment.cancellation_rate < 2) {
      strengths.push('Very low order cancellation rate');
    }

    if (metrics.customer_satisfaction.response_rate >= 80) {
      strengths.push('Strong customer engagement');
    }

    if (metrics.sales.average_order_value > 5000) {
      strengths.push('High average order value');
    }

    return strengths;
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovements(metrics: any): string[] {
    const improvements: string[] = [];

    if (metrics.fulfillment.on_time_delivery_rate < 90) {
      improvements.push('Improve on-time delivery rate');
    }

    if (metrics.customer_satisfaction.average_rating < 4.0) {
      improvements.push('Enhance product quality and customer service');
    }

    if (metrics.fulfillment.return_rate > 5) {
      improvements.push('Reduce product return rate');
    }

    if (metrics.customer_satisfaction.response_rate < 70) {
      improvements.push('Increase customer review response rate');
    }

    if (metrics.compliance.policy_violations > 0) {
      improvements.push('Ensure full compliance with marketplace policies');
    }

    return improvements;
  }

  /**
   * Calculate next tier requirements
   */
  private calculateNextTierRequirements(
    currentScore: number,
    currentTier: VendorTier
  ): Scorecard['next_tier_requirements'] {
    const tiers = ['starter', 'rising', 'established', 'elite'];
    const currentIndex = tiers.indexOf(currentTier.name);

    if (currentIndex === tiers.length - 1) {
      return null; // Already at highest tier
    }

    const nextTier = this.determineTier(currentTier.min_score + 15);
    const scoreNeeded = nextTier.min_score;
    const scoreGap = scoreNeeded - currentScore;

    return {
      tier: nextTier.name,
      score_needed: scoreNeeded,
      score_gap: Math.max(0, scoreGap),
    };
  }

  /**
   * Save scorecard
   */
  private async saveScorecard(scorecard: Scorecard): Promise<void> {
    await prisma.vendorScorecard.create({
      data: {
        vendor_id: scorecard.vendor_id,
        tier: scorecard.current_tier.name,
        overall_score: scorecard.overall_score,
        badges: JSON.stringify(scorecard.badges),
        strengths: JSON.stringify(scorecard.strengths),
        improvements: JSON.stringify(scorecard.improvements),
        generated_at: new Date(),
      },
    });
  }

  /**
   * Send performance alert
   */
  async sendPerformanceAlert(
    vendorId: number,
    alertType: 'warning' | 'critical' | 'improvement',
    message: string
  ): Promise<void> {
    await prisma.performanceAlert.create({
      data: {
        vendor_id: vendorId,
        alert_type: alertType,
        message,
        created_at: new Date(),
      },
    });

    logger.info('Performance alert sent', {
      vendor_id: vendorId,
      alert_type: alertType,
    });
  }
}

export default PerformanceScorecard;
