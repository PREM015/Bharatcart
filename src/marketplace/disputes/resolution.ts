/**
 * Dispute Resolution System
 * Purpose: Final resolution and arbitration
 * Description: Binding decisions, automated resolutions, appeal process
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export interface ResolutionDecision {
  dispute_id: number;
  decided_by: number;
  decision: 'favor_customer' | 'favor_vendor' | 'split' | 'no_fault';
  resolution_type: 'refund' | 'partial_refund' | 'replacement' | 'no_action';
  refund_percentage?: number;
  reasoning: string;
  is_final: boolean;
  appeal_deadline?: Date;
}

export class DisputeResolution {
  /**
   * Make resolution decision
   */
  async makeDecision(decision: ResolutionDecision): Promise<void> {
    logger.info('Making resolution decision', {
      dispute_id: decision.dispute_id,
      decision: decision.decision,
    });

    const dispute = await prisma.dispute.findUnique({
      where: { id: decision.dispute_id },
      include: {
        order: true,
        customer: true,
        vendor: true,
      },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Create resolution record
    const resolution = await prisma.disputeResolution.create({
      data: {
        dispute_id: decision.dispute_id,
        decided_by: decision.decided_by,
        decision: decision.decision,
        resolution_type: decision.resolution_type,
        refund_percentage: decision.refund_percentage,
        reasoning: decision.reasoning,
        is_final: decision.is_final,
        appeal_deadline: decision.appeal_deadline,
        decided_at: new Date(),
      },
    });

    // Execute resolution
    await this.executeResolution(dispute, decision);

    // Update dispute status
    await prisma.dispute.update({
      where: { id: decision.dispute_id },
      data: {
        status: decision.is_final ? 'CLOSED' : 'RESOLVED',
        resolution: decision.resolution_type,
        resolved_at: new Date(),
      },
    });

    // Notify parties
    await this.notifyResolution(dispute, decision);

    // Update vendor performance if necessary
    if (decision.decision === 'favor_customer') {
      await this.recordVendorIssue(dispute.vendor_id, decision.dispute_id);
    }

    logger.info('Resolution decision executed', {
      resolution_id: resolution.id,
    });
  }

  /**
   * Execute resolution
   */
  private async executeResolution(
    dispute: any,
    decision: ResolutionDecision
  ): Promise<void> {
    switch (decision.resolution_type) {
      case 'REFUND':
        await this.processRefund(dispute.order_id, dispute.order.total);
        break;

      case 'PARTIAL_REFUND':
        const refundAmount =
          (dispute.order.total * (decision.refund_percentage || 50)) / 100;
        await this.processRefund(dispute.order_id, refundAmount);
        break;

      case 'REPLACEMENT':
        await this.processReplacement(dispute.order_id);
        break;

      case 'NO_ACTION':
        // No action needed
        break;
    }
  }

  /**
   * Process refund
   */
  private async processRefund(orderId: number, amount: number): Promise<void> {
    await prisma.refund.create({
      data: {
        order_id: orderId,
        amount: Math.round(amount),
        reason: 'Dispute resolution - refund approved',
        status: 'APPROVED',
        processed_at: new Date(),
      },
    });
  }

  /**
   * Process replacement
   */
  private async processReplacement(orderId: number): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        requires_replacement: true,
        replacement_requested_at: new Date(),
      },
    });
  }

  /**
   * Record vendor issue
   */
  private async recordVendorIssue(
    vendorId: number,
    disputeId: number
  ): Promise<void> {
    await prisma.vendorIssue.create({
      data: {
        vendor_id: vendorId,
        issue_type: 'DISPUTE_LOST',
        dispute_id: disputeId,
        severity: 'MEDIUM',
        created_at: new Date(),
      },
    });

    // Check if vendor has too many issues
    const recentIssues = await prisma.vendorIssue.count({
      where: {
        vendor_id: vendorId,
        created_at: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    });

    if (recentIssues > 5) {
      // Flag vendor for review
      await prisma.vendor.update({
        where: { id: vendorId },
        data: { requires_review: true },
      });
    }
  }

  /**
   * File appeal
   */
  async fileAppeal(
    disputeId: number,
    appealedBy: 'customer' | 'vendor',
    reason: string,
    evidence: string[]
  ): Promise<number> {
    logger.info('Filing appeal', {
      dispute_id: disputeId,
      appealed_by: appealedBy,
    });

    const resolution = await prisma.disputeResolution.findFirst({
      where: { dispute_id: disputeId },
      orderBy: { decided_at: 'desc' },
    });

    if (!resolution) {
      throw new Error('No resolution found to appeal');
    }

    if (resolution.is_final) {
      throw new Error('This resolution is final and cannot be appealed');
    }

    if (
      resolution.appeal_deadline &&
      new Date() > resolution.appeal_deadline
    ) {
      throw new Error('Appeal deadline has passed');
    }

    const appeal = await prisma.disputeAppeal.create({
      data: {
        dispute_id: disputeId,
        resolution_id: resolution.id,
        appealed_by: appealedBy,
        reason,
        evidence: JSON.stringify(evidence),
        status: 'PENDING',
        created_at: new Date(),
      },
    });

    // Update dispute status
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'APPEAL' },
    });

    return appeal.id;
  }

  /**
   * Process appeal
   */
  async processAppeal(
    appealId: number,
    decision: 'uphold' | 'overturn',
    notes: string
  ): Promise<void> {
    logger.info('Processing appeal', {
      appeal_id: appealId,
      decision,
    });

    const appeal = await prisma.disputeAppeal.update({
      where: { id: appealId },
      data: {
        status: decision === 'uphold' ? 'REJECTED' : 'APPROVED',
        decision,
        decision_notes: notes,
        decided_at: new Date(),
      },
    });

    if (decision === 'overturn') {
      // Reverse original resolution
      await this.reverseResolution(appeal.dispute_id);
    }

    // Mark dispute as closed
    await prisma.dispute.update({
      where: { id: appeal.dispute_id },
      data: {
        status: 'CLOSED',
        is_final: true,
      },
    });
  }

  /**
   * Reverse resolution
   */
  private async reverseResolution(disputeId: number): Promise<void> {
    const resolution = await prisma.disputeResolution.findFirst({
      where: { dispute_id: disputeId },
      orderBy: { decided_at: 'desc' },
    });

    if (!resolution) return;

    // Reverse refund if applicable
    if (
      resolution.resolution_type === 'REFUND' ||
      resolution.resolution_type === 'PARTIAL_REFUND'
    ) {
      const refund = await prisma.refund.findFirst({
        where: {
          order_id: resolution.dispute.order_id,
          status: 'APPROVED',
        },
      });

      if (refund) {
        await prisma.refund.update({
          where: { id: refund.id },
          data: { status: 'REVERSED' },
        });
      }
    }
  }

  /**
   * Notify resolution
   */
  private async notifyResolution(
    dispute: any,
    decision: ResolutionDecision
  ): Promise<void> {
    // Notify customer
    await sendEmail({
      to: dispute.customer.email,
      subject: 'Dispute Resolution Decision',
      template: 'dispute_resolution',
      data: {
        dispute_id: dispute.id,
        decision: decision.decision,
        resolution_type: decision.resolution_type,
        reasoning: decision.reasoning,
        can_appeal: !decision.is_final,
      },
    });

    // Notify vendor
    await sendEmail({
      to: dispute.vendor.email,
      subject: 'Dispute Resolution Decision',
      template: 'dispute_resolution',
      data: {
        dispute_id: dispute.id,
        decision: decision.decision,
        resolution_type: decision.resolution_type,
        reasoning: decision.reasoning,
        can_appeal: !decision.is_final,
      },
    });
  }

  /**
   * Get resolution statistics
   */
  async getResolutionStats(vendorId?: number): Promise<any> {
    const where = vendorId ? { dispute: { vendor_id: vendorId } } : {};

    const resolutions = await prisma.disputeResolution.findMany({
      where,
      include: { dispute: true },
    });

    const total = resolutions.length;
    const favorCustomer = resolutions.filter(
      r => r.decision === 'FAVOR_CUSTOMER'
    ).length;
    const favorVendor = resolutions.filter(
      r => r.decision === 'FAVOR_VENDOR'
    ).length;

    return {
      total_resolutions: total,
      favor_customer: favorCustomer,
      favor_vendor: favorVendor,
      customer_win_rate: total > 0 ? (favorCustomer / total) * 100 : 0,
      vendor_win_rate: total > 0 ? (favorVendor / total) * 100 : 0,
    };
  }

  /**
   * Automatic resolution for simple cases
   */
  async autoResolveSimpleCases(): Promise<void> {
    logger.info('Running automatic resolution for simple cases');

    const disputes = await prisma.dispute.findMany({
      where: {
        status: 'OPEN',
        type: { in: ['NOT_RECEIVED', 'DAMAGED'] },
        created_at: { lte: new Date(Date.now() - 7 * 86400000) }, // 7 days old
      },
      include: { order: true },
    });

    for (const dispute of disputes) {
      // Auto-resolve if tracking shows delivery issue
      if (dispute.type === 'NOT_RECEIVED') {
        const tracking = await prisma.tracking.findFirst({
          where: { order_id: dispute.order_id },
        });

        if (tracking?.status !== 'DELIVERED') {
          await this.makeDecision({
            dispute_id: dispute.id,
            decided_by: 0, // System
            decision: 'favor_customer',
            resolution_type: 'refund',
            reasoning: 'Automatic resolution - item not delivered',
            is_final: false,
            appeal_deadline: new Date(Date.now() + 7 * 86400000),
          });
        }
      }
    }
  }
}

export default DisputeResolution;
