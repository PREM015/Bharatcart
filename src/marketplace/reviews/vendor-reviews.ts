/**
 * Vendor Review System
 * Purpose: Collect and manage vendor reviews
 * Description: Rating system, review collection, response management
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export interface VendorReview {
  vendor_id: number;
  order_id: number;
  customer_id: number;
  rating: number; // 1-5
  title: string;
  review: string;
  aspects: {
    product_quality: number;
    shipping_speed: number;
    communication: number;
    as_described: number;
  };
  would_recommend: boolean;
  images?: string[];
}

export class VendorReviewSystem {
  /**
   * Submit vendor review
   */
  async submitReview(review: VendorReview): Promise<number> {
    logger.info('Submitting vendor review', {
      vendor_id: review.vendor_id,
      rating: review.rating,
    });

    // Validate customer purchased from vendor
    const order = await prisma.order.findFirst({
      where: {
        id: review.order_id,
        customer_id: review.customer_id,
        vendor_id: review.vendor_id,
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
    });

    if (!order) {
      throw new Error('Invalid order or order not completed');
    }

    // Check if review already exists
    const existing = await prisma.vendorReview.findFirst({
      where: {
        order_id: review.order_id,
        customer_id: review.customer_id,
      },
    });

    if (existing) {
      throw new Error('Review already submitted for this order');
    }

    // Create review
    const created = await prisma.vendorReview.create({
      data: {
        vendor_id: review.vendor_id,
        order_id: review.order_id,
        customer_id: review.customer_id,
        rating: review.rating,
        title: review.title,
        review: review.review,
        product_quality: review.aspects.product_quality,
        shipping_speed: review.aspects.shipping_speed,
        communication: review.aspects.communication,
        as_described: review.aspects.as_described,
        would_recommend: review.would_recommend,
        images: review.images ? JSON.stringify(review.images) : null,
        status: 'PENDING_MODERATION',
        created_at: new Date(),
      },
    });

    // Update vendor rating
    await this.updateVendorRating(review.vendor_id);

    // Notify vendor
    await this.notifyVendorNewReview(review.vendor_id, created.id);

    logger.info('Vendor review submitted', { review_id: created.id });

    return created.id;
  }

  /**
   * Vendor response to review
   */
  async respondToReview(
    reviewId: number,
    vendorId: number,
    response: string
  ): Promise<void> {
    logger.info('Vendor responding to review', {
      review_id: reviewId,
      vendor_id: vendorId,
    });

    const review = await prisma.vendorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.vendor_id !== vendorId) {
      throw new Error('Review not found or unauthorized');
    }

    if (review.vendor_response) {
      throw new Error('Response already submitted');
    }

    await prisma.vendorReview.update({
      where: { id: reviewId },
      data: {
        vendor_response: response,
        vendor_response_at: new Date(),
      },
    });

    // Notify customer
    await this.notifyCustomerResponse(reviewId);
  }

  /**
   * Update vendor overall rating
   */
  private async updateVendorRating(vendorId: number): Promise<void> {
    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendor_id: vendorId,
        status: 'APPROVED',
      },
      select: {
        rating: true,
        product_quality: true,
        shipping_speed: true,
        communication: true,
        as_described: true,
      },
    });

    if (reviews.length === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const avgProductQuality =
      reviews.reduce((sum, r) => sum + r.product_quality, 0) / reviews.length;

    const avgShippingSpeed =
      reviews.reduce((sum, r) => sum + r.shipping_speed, 0) / reviews.length;

    const avgCommunication =
      reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length;

    const avgAsDescribed =
      reviews.reduce((sum, r) => sum + r.as_described, 0) / reviews.length;

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        rating: avgRating,
        review_count: reviews.length,
        rating_breakdown: JSON.stringify({
          product_quality: avgProductQuality,
          shipping_speed: avgShippingSpeed,
          communication: avgCommunication,
          as_described: avgAsDescribed,
        }),
      },
    });
  }

  /**
   * Get vendor reviews
   */
  async getVendorReviews(
    vendorId: number,
    filters?: {
      rating?: number;
      verified?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    reviews: any[];
    total: number;
    average_rating: number;
    rating_distribution: Record<number, number>;
  }> {
    const where: any = {
      vendor_id: vendorId,
      status: 'APPROVED',
    };

    if (filters?.rating) {
      where.rating = filters.rating;
    }

    const reviews = await prisma.vendorReview.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: filters?.limit || 20,
      skip: filters?.offset || 0,
    });

    const total = await prisma.vendorReview.count({ where });

    // Calculate rating distribution
    const allReviews = await prisma.vendorReview.findMany({
      where: { vendor_id: vendorId, status: 'APPROVED' },
      select: { rating: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    return {
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        review: r.review,
        customer_name: r.customer.name,
        customer_avatar: r.customer.avatar,
        created_at: r.created_at,
        vendor_response: r.vendor_response,
        images: r.images ? JSON.parse(r.images) : [],
        verified_purchase: true,
      })),
      total,
      average_rating: avgRating,
      rating_distribution: distribution,
    };
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: number, userId: number): Promise<void> {
    await prisma.reviewHelpful.create({
      data: {
        review_id: reviewId,
        user_id: userId,
        created_at: new Date(),
      },
    });

    // Update helpful count
    const count = await prisma.reviewHelpful.count({
      where: { review_id: reviewId },
    });

    await prisma.vendorReview.update({
      where: { id: reviewId },
      data: { helpful_count: count },
    });
  }

  /**
   * Report review
   */
  async reportReview(
    reviewId: number,
    reportedBy: number,
    reason: string
  ): Promise<void> {
    await prisma.reviewReport.create({
      data: {
        review_id: reviewId,
        reported_by: reportedBy,
        reason,
        status: 'PENDING',
        created_at: new Date(),
      },
    });

    // Flag review for moderation
    await prisma.vendorReview.update({
      where: { id: reviewId },
      data: { flagged: true },
    });
  }

  /**
   * Notify vendor of new review
   */
  private async notifyVendorNewReview(
    vendorId: number,
    reviewId: number
  ): Promise<void> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (vendor) {
      await sendEmail({
        to: vendor.email,
        subject: 'New Customer Review',
        template: 'vendor_new_review',
        data: {
          vendor_name: vendor.business_name,
          review_id: reviewId,
        },
      });
    }
  }

  /**
   * Notify customer of response
   */
  private async notifyCustomerResponse(reviewId: number): Promise<void> {
    const review = await prisma.vendorReview.findUnique({
      where: { id: reviewId },
      include: {
        customer: true,
        vendor: true,
      },
    });

    if (review) {
      await sendEmail({
        to: review.customer.email,
        subject: 'Vendor Responded to Your Review',
        template: 'customer_review_response',
        data: {
          vendor_name: review.vendor.business_name,
          review_id: reviewId,
        },
      });
    }
  }

  /**
   * Get vendor statistics
   */
  async getVendorStats(vendorId: number): Promise<any> {
    const reviews = await prisma.vendorReview.findMany({
      where: { vendor_id: vendorId, status: 'APPROVED' },
    });

    const total = reviews.length;
    const responseRate =
      total > 0
        ? (reviews.filter(r => r.vendor_response).length / total) * 100
        : 0;

    const recommendations = reviews.filter(r => r.would_recommend).length;
    const recommendationRate = total > 0 ? (recommendations / total) * 100 : 0;

    return {
      total_reviews: total,
      response_rate: responseRate,
      recommendation_rate: recommendationRate,
      recent_reviews: reviews.slice(-5),
    };
  }
}

export default VendorReviewSystem;
