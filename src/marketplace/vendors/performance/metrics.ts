/**
 * Vendor Performance Metrics
 * Purpose: Track and analyze vendor performance KPIs
 * Description: Sales metrics, fulfillment rates, customer satisfaction
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface PerformanceMetrics {
  vendor_id: number;
  period: {
    start: Date;
    end: Date;
  };
  sales: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    items_sold: number;
  };
  fulfillment: {
    on_time_delivery_rate: number;
    cancellation_rate: number;
    return_rate: number;
    average_processing_time: number; // hours
  };
  customer_satisfaction: {
    average_rating: number;
    total_reviews: number;
    response_rate: number;
    response_time: number; // hours
  };
  compliance: {
    policy_violations: number;
    dispute_count: number;
    late_shipments: number;
  };
  overall_score: number;
}

export class VendorPerformanceMetrics {
  /**
   * Calculate vendor performance metrics
   */
  async calculateMetrics(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    logger.info('Calculating vendor metrics', {
      vendor_id: vendorId,
      period: { start: startDate, end: endDate },
    });

    const [sales, fulfillment, customerSatisfaction, compliance] =
      await Promise.all([
        this.calculateSalesMetrics(vendorId, startDate, endDate),
        this.calculateFulfillmentMetrics(vendorId, startDate, endDate),
        this.calculateCustomerSatisfactionMetrics(vendorId, startDate, endDate),
        this.calculateComplianceMetrics(vendorId, startDate, endDate),
      ]);

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore({
      sales,
      fulfillment,
      customer_satisfaction: customerSatisfaction,
      compliance,
    });

    const metrics: PerformanceMetrics = {
      vendor_id: vendorId,
      period: { start: startDate, end: endDate },
      sales,
      fulfillment,
      customer_satisfaction: customerSatisfaction,
      compliance,
      overall_score: overallScore,
    };

    // Cache metrics
    await this.cacheMetrics(vendorId, metrics);

    // Save metrics history
    await this.saveMetricsHistory(metrics);

    return metrics;
  }

  /**
   * Calculate sales metrics
   */
  private async calculateSalesMetrics(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics['sales']> {
    const orders = await prisma.order.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      include: {
        items: true,
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const itemsSold = orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue / 100, // Convert from cents
      average_order_value: averageOrderValue / 100,
      items_sold: itemsSold,
    };
  }

  /**
   * Calculate fulfillment metrics
   */
  private async calculateFulfillmentMetrics(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics['fulfillment']> {
    const orders = await prisma.order.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
      },
      include: {
        fulfillment: true,
      },
    });

    const totalOrders = orders.length;
    const onTimeDeliveries = orders.filter(order => {
      if (!order.fulfillment) return false;
      return (
        order.fulfillment.delivered_at &&
        order.fulfillment.delivered_at <= order.fulfillment.expected_delivery_date
      );
    }).length;

    const cancelledOrders = orders.filter(
      order => order.status === 'CANCELLED'
    ).length;

    const returnedOrders = orders.filter(
      order => order.status === 'RETURNED'
    ).length;

    // Calculate average processing time
    const processingTimes = orders
      .filter(order => order.fulfillment?.shipped_at)
      .map(order => {
        const shipped = new Date(order.fulfillment!.shipped_at!);
        const created = new Date(order.created_at);
        return (shipped.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    return {
      on_time_delivery_rate:
        totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0,
      cancellation_rate:
        totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      return_rate: totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0,
      average_processing_time: avgProcessingTime,
    };
  }

  /**
   * Calculate customer satisfaction metrics
   */
  private async calculateCustomerSatisfactionMetrics(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics['customer_satisfaction']> {
    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

    // Calculate response rate and time
    const reviewsWithResponse = reviews.filter(review => review.vendor_response);
    const responseRate =
      totalReviews > 0 ? (reviewsWithResponse.length / totalReviews) * 100 : 0;

    const responseTimes = reviewsWithResponse
      .filter(review => review.vendor_response_at)
      .map(review => {
        const responseTime = new Date(review.vendor_response_at!);
        const reviewTime = new Date(review.created_at);
        return (responseTime.getTime() - reviewTime.getTime()) / (1000 * 60 * 60);
      });

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      response_rate: responseRate,
      response_time: avgResponseTime,
    };
  }

  /**
   * Calculate compliance metrics
   */
  private async calculateComplianceMetrics(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics['compliance']> {
    const violations = await prisma.policyViolation.count({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const disputes = await prisma.dispute.count({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
      },
    });

    const lateShipments = await prisma.order.count({
      where: {
        vendor_id: vendorId,
        created_at: { gte: startDate, lte: endDate },
        fulfillment: {
          shipped_at: { gt: prisma.order.fields.fulfillment.fields.expected_ship_date },
        },
      },
    });

    return {
      policy_violations: violations,
      dispute_count: disputes,
      late_shipments: lateShipments,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(
    metrics: Omit<PerformanceMetrics, 'vendor_id' | 'period' | 'overall_score'>
  ): number {
    // Weighted scoring (0-100)
    const weights = {
      sales: 0.2,
      fulfillment: 0.3,
      customer_satisfaction: 0.3,
      compliance: 0.2,
    };

    // Sales score (based on revenue growth and AOV)
    const salesScore = Math.min(100, (metrics.sales.total_revenue / 10000) * 100);

    // Fulfillment score
    const fulfillmentScore =
      metrics.fulfillment.on_time_delivery_rate * 0.5 +
      (100 - metrics.fulfillment.cancellation_rate) * 0.25 +
      (100 - metrics.fulfillment.return_rate) * 0.25;

    // Customer satisfaction score
    const customerScore =
      (metrics.customer_satisfaction.average_rating / 5) * 50 +
      (metrics.customer_satisfaction.response_rate / 100) * 50;

    // Compliance score (penalties for violations)
    const complianceScore = Math.max(
      0,
      100 -
        metrics.compliance.policy_violations * 10 -
        metrics.compliance.dispute_count * 5 -
        metrics.compliance.late_shipments * 2
    );

    const overallScore =
      salesScore * weights.sales +
      fulfillmentScore * weights.fulfillment +
      customerScore * weights.customer_satisfaction +
      complianceScore * weights.compliance;

    return Math.round(overallScore * 100) / 100;
  }

  /**
   * Cache metrics
   */
  private async cacheMetrics(
    vendorId: number,
    metrics: PerformanceMetrics
  ): Promise<void> {
    await redis.setex(
      `vendor:metrics:${vendorId}`,
      3600, // 1 hour
      JSON.stringify(metrics)
    );
  }

  /**
   * Save metrics history
   */
  private async saveMetricsHistory(metrics: PerformanceMetrics): Promise<void> {
    await prisma.vendorMetricsHistory.create({
      data: {
        vendor_id: metrics.vendor_id,
        period_start: metrics.period.start,
        period_end: metrics.period.end,
        total_orders: metrics.sales.total_orders,
        total_revenue: Math.round(metrics.sales.total_revenue * 100),
        on_time_delivery_rate: metrics.fulfillment.on_time_delivery_rate,
        average_rating: metrics.customer_satisfaction.average_rating,
        overall_score: metrics.overall_score,
        full_metrics: JSON.stringify(metrics),
      },
    });
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    vendorId: number,
    months: number = 6
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const history = await prisma.vendorMetricsHistory.findMany({
      where: {
        vendor_id: vendorId,
        period_start: { gte: startDate },
      },
      orderBy: { period_start: 'asc' },
    });

    return history.map(record => ({
      period: {
        start: record.period_start,
        end: record.period_end,
      },
      revenue: record.total_revenue / 100,
      orders: record.total_orders,
      rating: record.average_rating,
      score: record.overall_score,
    }));
  }

  /**
   * Get vendor ranking
   */
  async getVendorRanking(vendorId: number): Promise<{
    rank: number;
    total_vendors: number;
    percentile: number;
  }> {
    // Get latest metrics for all vendors
    const allVendors = await prisma.vendorMetricsHistory.findMany({
      where: {
        period_start: {
          gte: new Date(Date.now() - 30 * 86400000), // Last 30 days
        },
      },
      orderBy: { overall_score: 'desc' },
      distinct: ['vendor_id'],
    });

    const vendorIndex = allVendors.findIndex(v => v.vendor_id === vendorId);
    const rank = vendorIndex + 1;
    const totalVendors = allVendors.length;
    const percentile = ((totalVendors - rank) / totalVendors) * 100;

    return {
      rank,
      total_vendors: totalVendors,
      percentile: Math.round(percentile * 100) / 100,
    };
  }

  /**
   * Generate performance report
   */
  async generateReport(
    vendorId: number,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const metrics = await this.calculateMetrics(vendorId, startDate, endDate);
    const trends = await this.getPerformanceTrends(vendorId, 6);
    const ranking = await this.getVendorRanking(vendorId);

    return {
      metrics,
      trends,
      ranking,
      recommendations: this.generateRecommendations(metrics),
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.fulfillment.on_time_delivery_rate < 90) {
      recommendations.push(
        'Improve on-time delivery rate by optimizing shipping processes'
      );
    }

    if (metrics.customer_satisfaction.average_rating < 4.0) {
      recommendations.push(
        'Focus on improving product quality and customer service'
      );
    }

    if (metrics.customer_satisfaction.response_rate < 80) {
      recommendations.push(
        'Increase customer review response rate to above 80%'
      );
    }

    if (metrics.fulfillment.cancellation_rate > 5) {
      recommendations.push(
        'Reduce order cancellations by maintaining accurate inventory'
      );
    }

    if (metrics.compliance.policy_violations > 0) {
      recommendations.push(
        'Review and comply with marketplace policies to avoid violations'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent performance! Keep up the good work.');
    }

    return recommendations;
  }
}

export default VendorPerformanceMetrics;
