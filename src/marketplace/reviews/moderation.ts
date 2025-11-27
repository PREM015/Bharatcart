/**
 * Review Moderation System
 * Purpose: Moderate vendor reviews for quality and compliance
 * Description: Automated filtering, manual review, spam detection
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
  confidence: number;
  flags: string[];
}

export class ReviewModeration {
  private readonly bannedWords = [
    'spam',
    'scam',
    'fake',
    // Add more banned words
  ];

  /**
   * Moderate review
   */
  async moderateReview(reviewId: number): Promise<ModerationResult> {
    logger.info('Moderating review', { review_id: reviewId });

    const review = await prisma.vendorReview.findUnique({
      where: { id: reviewId },
      include: {
        customer: true,
        vendor: true,
      },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const checks = {
      spam: this.checkSpam(review.review),
      profanity: this.checkProfanity(review.review),
      length: this.checkLength(review.review),
      suspicious: this.checkSuspiciousPatterns(review),
      sentiment: this.checkSentiment(review.review, review.rating),
    };

    const flags: string[] = [];
    const reasons: string[] = [];
    let approved = true;

    if (checks.spam.isSpam) {
      flags.push('spam');
      reasons.push('Potential spam detected');
      approved = false;
    }

    if (checks.profanity.hasProfanity) {
      flags.push('profanity');
      reasons.push('Contains inappropriate language');
      approved = false;
    }

    if (!checks.length.isValid) {
      flags.push('too_short');
      reasons.push('Review too short or generic');
    }

    if (checks.suspicious.isSuspicious) {
      flags.push('suspicious');
      reasons.push('Suspicious pattern detected');
      approved = false;
    }

    if (!checks.sentiment.isConsistent) {
      flags.push('inconsistent');
      reasons.push('Rating inconsistent with review text');
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(checks);

    // Update review status
    const status = approved ? 'APPROVED' : 'REJECTED';

    await prisma.vendorReview.update({
      where: { id: reviewId },
      data: {
        status,
        moderation_flags: JSON.stringify(flags),
        moderation_notes: reasons.join('; '),
        moderated_at: new Date(),
      },
    });

    // Log moderation
    await prisma.moderationLog.create({
      data: {
        review_id: reviewId,
        result: status,
        flags: JSON.stringify(flags),
        confidence,
        automated: true,
      },
    });

    return {
      approved,
      reasons,
      confidence,
      flags,
    };
  }

  /**
   * Check for spam
   */
  private checkSpam(text: string): { isSpam: boolean; score: number } {
    const spamIndicators = [
      /http[s]?:\/\//i, // URLs
      /www\./i,
      /(buy now|click here|limited time)/i,
      /(.){4,}/, // Repeated characters
    ];

    let score = 0;
    spamIndicators.forEach(pattern => {
      if (pattern.test(text)) score += 0.3;
    });

    // Check for excessive punctuation
    const punctuationCount = (text.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount > 3) score += 0.2;

    return {
      isSpam: score > 0.5,
      score,
    };
  }

  /**
   * Check for profanity
   */
  private checkProfanity(text: string): { hasProfanity: boolean } {
    const lowerText = text.toLowerCase();
    const hasProfanity = this.bannedWords.some(word =>
      lowerText.includes(word)
    );

    return { hasProfanity };
  }

  /**
   * Check review length
   */
  private checkLength(text: string): { isValid: boolean } {
    const wordCount = text.trim().split(/\s+/).length;
    
    // Too short (less than 5 words)
    if (wordCount < 5) return { isValid: false };
    
    // Generic short reviews
    const genericPhrases = ['good', 'nice', 'ok', 'fine', 'great'];
    if (wordCount < 10 && genericPhrases.some(p => text.toLowerCase() === p)) {
      return { isValid: false };
    }

    return { isValid: true };
  }

  /**
   * Check suspicious patterns
   */
  private checkSuspiciousPatterns(review: any): { isSuspicious: boolean } {
    // Check if user has multiple reviews in short time
    // Check if reviews are too similar
    // Check if user is new with only positive/negative reviews
    
    // Placeholder - implement actual logic
    return { isSuspicious: false };
  }

  /**
   * Check sentiment consistency
   */
  private checkSentiment(
    text: string,
    rating: number
  ): { isConsistent: boolean } {
    // Simple sentiment analysis
    const positiveWords = /(good|great|excellent|amazing|love|best)/gi;
    const negativeWords = /(bad|terrible|awful|worst|hate|poor)/gi;

    const positiveCount = (text.match(positiveWords) || []).length;
    const negativeCount = (text.match(negativeWords) || []).length;

    const sentiment = positiveCount - negativeCount;

    // High rating should have positive sentiment
    if (rating >= 4 && sentiment < 0) return { isConsistent: false };

    // Low rating should have negative sentiment
    if (rating <= 2 && sentiment > 0) return { isConsistent: false };

    return { isConsistent: true };
  }

  /**
   * Calculate moderation confidence
   */
  private calculateConfidence(checks: any): number {
    let confidence = 100;

    if (checks.spam.score > 0.3) confidence -= checks.spam.score * 50;
    if (checks.profanity.hasProfanity) confidence -= 30;
    if (!checks.length.isValid) confidence -= 20;
    if (checks.suspicious.isSuspicious) confidence -= 25;
    if (!checks.sentiment.isConsistent) confidence -= 15;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Manual moderation override
   */
  async manualModeration(
    reviewId: number,
    moderatorId: number,
    decision: 'approve' | 'reject',
    notes: string
  ): Promise<void> {
    logger.info('Manual moderation', {
      review_id: reviewId,
      decision,
    });

    await prisma.vendorReview.update({
      where: { id: reviewId },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        moderation_notes: notes,
        moderated_by: moderatorId,
        moderated_at: new Date(),
      },
    });

    await prisma.moderationLog.create({
      data: {
        review_id: reviewId,
        result: decision.toUpperCase(),
        moderator_id: moderatorId,
        notes,
        automated: false,
      },
    });
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(limit: number = 50): Promise<any[]> {
    return await prisma.vendorReview.findMany({
      where: {
        OR: [
          { status: 'PENDING_MODERATION' },
          { flagged: true, status: 'APPROVED' },
        ],
      },
      include: {
        customer: {
          select: { name: true, email: true },
        },
        vendor: {
          select: { business_name: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<any> {
    const last30Days = new Date(Date.now() - 30 * 86400000);

    const stats = await prisma.vendorReview.groupBy({
      by: ['status'],
      where: {
        created_at: { gte: last30Days },
      },
      _count: true,
    });

    const total = stats.reduce((sum, s) => sum + s._count, 0);

    return {
      total_reviews: total,
      approved: stats.find(s => s.status === 'APPROVED')?._count || 0,
      rejected: stats.find(s => s.status === 'REJECTED')?._count || 0,
      pending: stats.find(s => s.status === 'PENDING_MODERATION')?._count || 0,
      approval_rate: total > 0 ? ((stats.find(s => s.status === 'APPROVED')?._count || 0) / total) * 100 : 0,
    };
  }
}

export default ReviewModeration;
