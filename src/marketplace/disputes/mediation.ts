/**
 * Dispute Mediation System
 * Purpose: Facilitate mediation between customers and vendors
 * Description: Structured negotiation, settlement proposals, arbitration
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export interface MediationSession {
  dispute_id: number;
  mediator_id: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: Date;
  notes?: string;
}

export interface SettlementProposal {
  dispute_id: number;
  proposed_by: 'customer' | 'vendor' | 'mediator';
  offer_type: 'refund' | 'partial_refund' | 'replacement' | 'credit' | 'discount';
  offer_amount?: number;
  conditions: string;
  valid_until: Date;
}

export class DisputeMediation {
  /**
   * Initiate mediation
   */
  async initiateMediation(
    disputeId: number,
    mediatorId: number
  ): Promise<MediationSession> {
    logger.info('Initiating mediation', {
      dispute_id: disputeId,
      mediator_id: mediatorId,
    });

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        customer: true,
        vendor: true,
      },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Schedule mediation session (48 hours from now)
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const session = await prisma.mediationSession.create({
      data: {
        dispute_id: disputeId,
        mediator_id: mediatorId,
        status: 'SCHEDULED',
        scheduled_at: scheduledAt,
        created_at: new Date(),
      },
    });

    // Update dispute status
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'MEDIATION' },
    });

    // Notify parties
    await this.notifyParties(dispute, session);

    logger.info('Mediation session scheduled', {
      session_id: session.id,
      scheduled_at: scheduledAt,
    });

    return {
      dispute_id: disputeId,
      mediator_id: mediatorId,
      status: 'scheduled',
      scheduled_at: scheduledAt,
    };
  }

  /**
   * Submit settlement proposal
   */
  async submitProposal(proposal: SettlementProposal): Promise<number> {
    logger.info('Submitting settlement proposal', {
      dispute_id: proposal.dispute_id,
      proposed_by: proposal.proposed_by,
    });

    const created = await prisma.settlementProposal.create({
      data: {
        dispute_id: proposal.dispute_id,
        proposed_by: proposal.proposed_by,
        offer_type: proposal.offer_type,
        offer_amount: proposal.offer_amount
          ? Math.round(proposal.offer_amount * 100)
          : null,
        conditions: proposal.conditions,
        valid_until: proposal.valid_until,
        status: 'PENDING',
        created_at: new Date(),
      },
    });

    // Notify other party
    await this.notifyProposal(proposal.dispute_id, proposal.proposed_by);

    return created.id;
  }

  /**
   * Respond to settlement proposal
   */
  async respondToProposal(
    proposalId: number,
    response: 'accept' | 'reject' | 'counter',
    counterOffer?: SettlementProposal
  ): Promise<void> {
    logger.info('Responding to settlement proposal', {
      proposal_id: proposalId,
      response,
    });

    const proposal = await prisma.settlementProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (response === 'accept') {
      // Accept proposal
      await prisma.settlementProposal.update({
        where: { id: proposalId },
        data: {
          status: 'ACCEPTED',
          accepted_at: new Date(),
        },
      });

      // Implement settlement
      await this.implementSettlement(proposal);

      // Close dispute
      await prisma.dispute.update({
        where: { id: proposal.dispute_id },
        data: {
          status: 'RESOLVED',
          resolution: proposal.offer_type,
          resolved_at: new Date(),
        },
      });
    } else if (response === 'reject') {
      // Reject proposal
      await prisma.settlementProposal.update({
        where: { id: proposalId },
        data: { status: 'REJECTED' },
      });
    } else if (response === 'counter' && counterOffer) {
      // Submit counter-offer
      await prisma.settlementProposal.update({
        where: { id: proposalId },
        data: { status: 'COUNTERED' },
      });

      await this.submitProposal(counterOffer);
    }
  }

  /**
   * Implement settlement
   */
  private async implementSettlement(proposal: any): Promise<void> {
    logger.info('Implementing settlement', {
      proposal_id: proposal.id,
      offer_type: proposal.offer_type,
    });

    const dispute = await prisma.dispute.findUnique({
      where: { id: proposal.dispute_id },
      include: { order: true },
    });

    if (!dispute) return;

    switch (proposal.offer_type) {
      case 'REFUND':
        // Process full refund
        await prisma.refund.create({
          data: {
            order_id: dispute.order_id,
            amount: dispute.order.total,
            reason: 'Settlement agreement - full refund',
            status: 'APPROVED',
          },
        });
        break;

      case 'PARTIAL_REFUND':
        // Process partial refund
        await prisma.refund.create({
          data: {
            order_id: dispute.order_id,
            amount: proposal.offer_amount || dispute.order.total / 2,
            reason: 'Settlement agreement - partial refund',
            status: 'APPROVED',
          },
        });
        break;

      case 'REPLACEMENT':
        // Mark order for replacement
        await prisma.order.update({
          where: { id: dispute.order_id },
          data: { requires_replacement: true },
        });
        break;

      case 'CREDIT':
        // Issue store credit
        await prisma.storeCredit.create({
          data: {
            user_id: dispute.customer_id,
            amount: proposal.offer_amount || 0,
            reason: 'Settlement agreement - store credit',
            expires_at: new Date(Date.now() + 365 * 86400000), // 1 year
          },
        });
        break;

      case 'DISCOUNT':
        // Issue discount coupon
        await prisma.coupon.create({
          data: {
            code: `SETTLEMENT-${dispute.id}`,
            discount_type: 'PERCENTAGE',
            discount_value: proposal.offer_amount || 10,
            user_id: dispute.customer_id,
            expires_at: new Date(Date.now() + 90 * 86400000), // 90 days
          },
        });
        break;
    }
  }

  /**
   * Record mediation notes
   */
  async addMediationNotes(
    sessionId: number,
    notes: string,
    attachments?: string[]
  ): Promise<void> {
    await prisma.mediationSession.update({
      where: { id: sessionId },
      data: {
        notes,
        attachments: attachments ? JSON.stringify(attachments) : null,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Complete mediation session
   */
  async completeMediation(
    sessionId: number,
    outcome: 'agreement_reached' | 'no_agreement' | 'escalated',
    summary: string
  ): Promise<void> {
    logger.info('Completing mediation session', {
      session_id: sessionId,
      outcome,
    });

    const session = await prisma.mediationSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        outcome,
        summary,
        completed_at: new Date(),
      },
    });

    if (outcome === 'escalated') {
      // Escalate to arbitration
      await prisma.dispute.update({
        where: { id: session.dispute_id },
        data: { status: 'ARBITRATION' },
      });
    }
  }

  /**
   * Notify parties about mediation
   */
  private async notifyParties(dispute: any, session: any): Promise<void> {
    // Notify customer
    await sendEmail({
      to: dispute.customer.email,
      subject: 'Mediation Session Scheduled',
      template: 'mediation_scheduled',
      data: {
        dispute_id: dispute.id,
        scheduled_at: session.scheduled_at,
      },
    });

    // Notify vendor
    await sendEmail({
      to: dispute.vendor.email,
      subject: 'Mediation Session Scheduled',
      template: 'mediation_scheduled',
      data: {
        dispute_id: dispute.id,
        scheduled_at: session.scheduled_at,
      },
    });
  }

  /**
   * Notify about proposal
   */
  private async notifyProposal(
    disputeId: number,
    proposedBy: string
  ): Promise<void> {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        customer: true,
        vendor: true,
      },
    });

    if (!dispute) return;

    const recipient =
      proposedBy === 'customer' ? dispute.vendor.email : dispute.customer.email;

    await sendEmail({
      to: recipient,
      subject: 'New Settlement Proposal',
      template: 'settlement_proposal',
      data: {
        dispute_id: disputeId,
      },
    });
  }

  /**
   * Get mediation statistics
   */
  async getMediationStats(): Promise<any> {
    const sessions = await prisma.mediationSession.findMany({
      where: {
        created_at: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    });

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const agreements = sessions.filter(s => s.outcome === 'AGREEMENT_REACHED').length;
    const successRate = total > 0 ? (agreements / completed) * 100 : 0;

    return {
      total_sessions: total,
      completed_sessions: completed,
      agreements_reached: agreements,
      success_rate: successRate,
    };
  }
}

export default DisputeMediation;
