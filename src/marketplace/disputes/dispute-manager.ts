/**
 * Dispute Management System
 * Purpose: Handle customer-vendor disputes
 * Description: Dispute creation, tracking, escalation
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export interface DisputeRequest {
  order_id: number;
  customer_id: number;
  vendor_id: number;
  type: 'product_quality' | 'not_received' | 'wrong_item' | 'damaged' | 'other';
  subject: string;
  description: string;
  evidence: string[];
  requested_resolution: 'refund' | 'replacement' | 'partial_refund';
}

export interface DisputeUpdate {
  status?: 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
  resolution?: string;
  resolution_notes?: string;
}

export class DisputeManager {
  /**
   * Create new dispute
   */
  async createDispute(request: DisputeRequest): Promise<number> {
    logger.info('Creating dispute', {
      order_id: request.order_id,
      type: request.type,
    });

    try {
      // Check if dispute already exists
      const existing = await prisma.dispute.findFirst({
        where: {
          order_id: request.order_id,
          status: { in: ['OPEN', 'INVESTIGATING'] },
        },
      });

      if (existing) {
        throw new Error('Active dispute already exists for this order');
      }

      // Create dispute
      const dispute = await prisma.dispute.create({
        data: {
          order_id: request.order_id,
          customer_id: request.customer_id,
          vendor_id: request.vendor_id,
          type: request.type,
          subject: request.subject,
          description: request.description,
          evidence: JSON.stringify(request.evidence),
          requested_resolution: request.requested_resolution,
          status: 'OPEN',
          priority: this.calculatePriority(request.type),
          created_at: new Date(),
        },
      });

      // Notify vendor
      await this.notifyVendor(dispute.id, request.vendor_id);

      // Notify admin
      await this.notifyAdmin(dispute.id);

      logger.info('Dispute created', { dispute_id: dispute.id });

      return dispute.id;
    } catch (error) {
      logger.error('Failed to create dispute', { error });
      throw error;
    }
  }

  /**
   * Update dispute
   */
  async updateDispute(disputeId: number, update: DisputeUpdate): Promise<void> {
    logger.info('Updating dispute', { dispute_id: disputeId });

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: update.status?.toUpperCase(),
        resolution: update.resolution,
        resolution_notes: update.resolution_notes,
        updated_at: new Date(),
      },
    });

    // Log activity
    await prisma.disputeActivity.create({
      data: {
        dispute_id: disputeId,
        action: 'STATUS_UPDATED',
        details: JSON.stringify(update),
        created_at: new Date(),
      },
    });
  }

  /**
   * Add message to dispute
   */
  async addMessage(
    disputeId: number,
    userId: number,
    userType: 'customer' | 'vendor' | 'admin',
    message: string,
    attachments?: string[]
  ): Promise<void> {
    await prisma.disputeMessage.create({
      data: {
        dispute_id: disputeId,
        user_id: userId,
        user_type: userType,
        message,
        attachments: attachments ? JSON.stringify(attachments) : null,
        created_at: new Date(),
      },
    });

    // Update dispute timestamp
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { updated_at: new Date() },
    });
  }

  /**
   * Escalate dispute
   */
  async escalateDispute(disputeId: number, reason: string): Promise<void> {
    logger.info('Escalating dispute', { dispute_id: disputeId });

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'ESCALATED',
        priority: 'HIGH',
        escalated_at: new Date(),
        escalation_reason: reason,
      },
    });

    // Notify senior support
    await this.notifyEscalation(disputeId);
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: number,
    resolution: 'refund' | 'replacement' | 'partial_refund' | 'no_action',
    notes: string,
    resolvedBy: number
  ): Promise<void> {
    logger.info('Resolving dispute', {
      dispute_id: disputeId,
      resolution,
    });

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update dispute
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolution_notes: notes,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
      },
    });

    // Process resolution
    await this.processResolution(dispute, resolution);

    // Notify parties
    await this.notifyResolution(disputeId);
  }

  /**
   * Calculate dispute priority
   */
  private calculatePriority(type: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highPriority = ['not_received', 'damaged'];
    const mediumPriority = ['wrong_item', 'product_quality'];

    if (highPriority.includes(type)) return 'HIGH';
    if (mediumPriority.includes(type)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Process resolution
   */
  private async processResolution(
    dispute: any,
    resolution: string
  ): Promise<void> {
    switch (resolution) {
      case 'refund':
        // Process full refund
        await prisma.refund.create({
          data: {
            order_id: dispute.order_id,
            amount: dispute.order.total,
            reason: 'Dispute resolved - full refund',
            status: 'PENDING',
          },
        });
        break;

      case 'partial_refund':
        // Process partial refund (50%)
        await prisma.refund.create({
          data: {
            order_id: dispute.order_id,
            amount: dispute.order.total / 2,
            reason: 'Dispute resolved - partial refund',
            status: 'PENDING',
          },
        });
        break;

      case 'replacement':
        // Create replacement order
        await prisma.order.update({
          where: { id: dispute.order_id },
          data: { requires_replacement: true },
        });
        break;
    }
  }

  /**
   * Notify vendor
   */
  private async notifyVendor(disputeId: number, vendorId: number): Promise<void> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (vendor) {
      await sendEmail({
        to: vendor.email,
        subject: 'New Dispute Opened',
        template: 'vendor_dispute_notification',
        data: {
          dispute_id: disputeId,
          vendor_name: vendor.business_name,
        },
      });
    }
  }

  /**
   * Notify admin
   */
  private async notifyAdmin(disputeId: number): Promise<void> {
    await sendEmail({
      to: process.env.ADMIN_EMAIL!,
      subject: 'New Dispute Requires Attention',
      template: 'admin_dispute_notification',
      data: {
        dispute_id: disputeId,
      },
    });
  }

  /**
   * Notify escalation
   */
  private async notifyEscalation(disputeId: number): Promise<void> {
    await sendEmail({
      to: process.env.SENIOR_SUPPORT_EMAIL!,
      subject: 'Dispute Escalated',
      template: 'dispute_escalation',
      data: {
        dispute_id: disputeId,
      },
    });
  }

  /**
   * Notify resolution
   */
  private async notifyResolution(disputeId: number): Promise<void> {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        customer: true,
        vendor: true,
      },
    });

    if (dispute) {
      // Notify customer
      await sendEmail({
        to: dispute.customer.email,
        subject: 'Dispute Resolved',
        template: 'customer_dispute_resolved',
        data: {
          dispute_id: disputeId,
          resolution: dispute.resolution,
        },
      });

      // Notify vendor
      await sendEmail({
        to: dispute.vendor.email,
        subject: 'Dispute Resolved',
        template: 'vendor_dispute_resolved',
        data: {
          dispute_id: disputeId,
          resolution: dispute.resolution,
        },
      });
    }
  }

  /**
   * Get dispute statistics
   */
  async getDisputeStats(vendorId?: number): Promise<any> {
    const where = vendorId ? { vendor_id: vendorId } : {};

    const stats = await prisma.dispute.groupBy({
      by: ['status', 'type'],
      where,
      _count: true,
    });

    return {
      by_status: stats.reduce((acc, stat) => {
        acc[stat.status] = (acc[stat.status] || 0) + stat._count;
        return acc;
      }, {} as Record<string, number>),
      by_type: stats.reduce((acc, stat) => {
        acc[stat.type] = (acc[stat.type] || 0) + stat._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export default DisputeManager;
