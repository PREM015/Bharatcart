/**
 * Lead Nurturing Engine
 * Purpose: Automated lead nurturing campaigns
 * Description: Drip campaigns, email sequences, nurturing workflows
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface NurturingCampaign {
  id: string;
  name: string;
  description: string;
  trigger: CampaignTrigger;
  steps: NurturingStep[];
  status: 'active' | 'paused' | 'draft';
  created_at: Date;
}

export interface CampaignTrigger {
  type: 'lead_created' | 'form_submitted' | 'score_threshold' | 'manual';
  conditions?: any;
}

export interface NurturingStep {
  id: string;
  order: number;
  delay_days: number;
  action_type: 'send_email' | 'assign_task' | 'update_score' | 'notify_sales';
  action_config: any;
}

export interface CampaignEnrollment {
  id?: number;
  campaign_id: string;
  contact_id: number;
  current_step: number;
  enrolled_at: Date;
  completed_at?: Date;
  status: 'active' | 'completed' | 'paused' | 'exited';
}

export class LeadNurturingEngine extends EventEmitter {
  private campaigns: Map<string, NurturingCampaign> = new Map();

  /**
   * Create nurturing campaign
   */
  async createCampaign(campaign: Omit<NurturingCampaign, 'created_at'>): Promise<NurturingCampaign> {
    logger.info('Creating nurturing campaign', { name: campaign.name });

    const newCampaign: NurturingCampaign = {
      ...campaign,
      created_at: new Date(),
    };

    this.campaigns.set(campaign.id, newCampaign);

    await prisma.nurturingCampaign.create({
      data: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        trigger: JSON.stringify(campaign.trigger),
        steps: JSON.stringify(campaign.steps),
        status: campaign.status,
        created_at: new Date(),
      },
    });

    return newCampaign;
  }

  /**
   * Enroll contact in campaign
   */
  async enrollContact(campaignId: string, contactId: number): Promise<CampaignEnrollment> {
    logger.info('Enrolling contact in campaign', { campaign_id: campaignId, contact_id: contactId });

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if already enrolled
    const existing = await prisma.campaignEnrollment.findFirst({
      where: {
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'active',
      },
    });

    if (existing) {
      throw new Error('Contact already enrolled in campaign');
    }

    const enrollment: CampaignEnrollment = {
      campaign_id: campaignId,
      contact_id: contactId,
      current_step: 0,
      enrolled_at: new Date(),
      status: 'active',
    };

    const created = await prisma.campaignEnrollment.create({
      data: enrollment,
    });

    enrollment.id = created.id;

    // Schedule first step
    await this.scheduleNextStep(enrollment);

    this.emit('contact_enrolled', enrollment);

    return enrollment;
  }

  /**
   * Schedule next step in campaign
   */
  private async scheduleNextStep(enrollment: CampaignEnrollment): Promise<void> {
    const campaign = this.campaigns.get(enrollment.campaign_id);
    if (!campaign) {
      return;
    }

    const nextStepIndex = enrollment.current_step;
    if (nextStepIndex >= campaign.steps.length) {
      // Campaign completed
      await this.completeCampaign(enrollment.id!);
      return;
    }

    const nextStep = campaign.steps[nextStepIndex];

    // Calculate execution time
    const executionTime = new Date();
    executionTime.setDate(executionTime.getDate() + nextStep.delay_days);

    // Schedule step execution
    await prisma.scheduledCampaignStep.create({
      data: {
        enrollment_id: enrollment.id!,
        step_id: nextStep.id,
        scheduled_for: executionTime,
        status: 'pending',
      },
    });

    logger.info('Campaign step scheduled', {
      enrollment_id: enrollment.id,
      step_id: nextStep.id,
      scheduled_for: executionTime,
    });
  }

  /**
   * Execute campaign step
   */
  async executeStep(enrollmentId: number, stepId: string): Promise<void> {
    logger.info('Executing campaign step', { enrollment_id: enrollmentId, step_id: stepId });

    const enrollment = await prisma.campaignEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const campaign = this.campaigns.get(enrollment.campaign_id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const step = campaign.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    // Execute step action
    await this.executeAction(step, enrollment.contact_id);

    // Update enrollment to next step
    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: {
        current_step: enrollment.current_step + 1,
      },
    });

    // Mark step as completed
    await prisma.scheduledCampaignStep.updateMany({
      where: {
        enrollment_id: enrollmentId,
        step_id: stepId,
      },
      data: {
        status: 'completed',
        executed_at: new Date(),
      },
    });

    // Schedule next step
    enrollment.current_step += 1;
    await this.scheduleNextStep(enrollment);

    this.emit('step_executed', { enrollment_id: enrollmentId, step_id: stepId });
  }

  /**
   * Execute step action
   */
  private async executeAction(step: NurturingStep, contactId: number): Promise<void> {
    switch (step.action_type) {
      case 'send_email':
        await this.sendEmail(contactId, step.action_config);
        break;

      case 'assign_task':
        await this.assignTask(contactId, step.action_config);
        break;

      case 'update_score':
        await this.updateScore(contactId, step.action_config);
        break;

      case 'notify_sales':
        await this.notifySales(contactId, step.action_config);
        break;

      default:
        logger.warn('Unknown action type', { action_type: step.action_type });
    }
  }

  /**
   * Send email action
   */
  private async sendEmail(contactId: number, config: any): Promise<void> {
    logger.info('Sending nurturing email', { contact_id: contactId, template: config.template });

    // Integration with email service
    await prisma.emailLog.create({
      data: {
        contact_id: contactId,
        template_id: config.template,
        subject: config.subject,
        sent_at: new Date(),
        status: 'sent',
      },
    });
  }

  /**
   * Assign task action
   */
  private async assignTask(contactId: number, config: any): Promise<void> {
    logger.info('Assigning task', { contact_id: contactId, task: config.task_type });

    await prisma.task.create({
      data: {
        contact_id: contactId,
        title: config.title,
        description: config.description,
        due_date: new Date(Date.now() + config.due_days * 24 * 60 * 60 * 1000),
        assigned_to: config.assigned_to,
        status: 'pending',
      },
    });
  }

  /**
   * Update score action
   */
  private async updateScore(contactId: number, config: any): Promise<void> {
    logger.info('Updating lead score', { contact_id: contactId, points: config.points });

    const currentScore = await prisma.leadScore.findUnique({
      where: { contact_id: contactId },
    });

    if (currentScore) {
      await prisma.leadScore.update({
        where: { contact_id: contactId },
        data: {
          total_score: currentScore.total_score + config.points,
          behavioral_score: currentScore.behavioral_score + config.points,
        },
      });
    }
  }

  /**
   * Notify sales action
   */
  private async notifySales(contactId: number, config: any): Promise<void> {
    logger.info('Notifying sales team', { contact_id: contactId });

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (contact?.owner_id) {
      // Send notification to assigned sales rep
      this.emit('sales_notification', {
        user_id: contact.owner_id,
        contact_id: contactId,
        message: config.message,
      });
    }
  }

  /**
   * Complete campaign
   */
  private async completeCampaign(enrollmentId: number): Promise<void> {
    logger.info('Completing campaign', { enrollment_id: enrollmentId });

    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
    });

    this.emit('campaign_completed', { enrollment_id: enrollmentId });
  }

  /**
   * Unenroll contact from campaign
   */
  async unenrollContact(enrollmentId: number, reason: string): Promise<void> {
    logger.info('Unenrolling contact', { enrollment_id: enrollmentId, reason });

    await prisma.campaignEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'exited',
        completed_at: new Date(),
      },
    });

    // Cancel pending steps
    await prisma.scheduledCampaignStep.updateMany({
      where: {
        enrollment_id: enrollmentId,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
      },
    });

    this.emit('contact_unenrolled', { enrollment_id: enrollmentId, reason });
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(campaignId: string): Promise<any> {
    const enrollments = await prisma.campaignEnrollment.groupBy({
      by: ['status'],
      where: { campaign_id: campaignId },
      _count: true,
    });

    const totalEnrollments = enrollments.reduce((sum, e) => sum + e._count, 0);
    const completed = enrollments.find(e => e.status === 'completed')?._count || 0;

    return {
      campaign_id: campaignId,
      total_enrollments: totalEnrollments,
      active: enrollments.find(e => e.status === 'active')?._count || 0,
      completed,
      completion_rate: totalEnrollments > 0 ? completed / totalEnrollments : 0,
      exited: enrollments.find(e => e.status === 'exited')?._count || 0,
    };
  }

  /**
   * Process scheduled steps
   */
  async processScheduledSteps(): Promise<void> {
    logger.info('Processing scheduled campaign steps');

    const dueSteps = await prisma.scheduledCampaignStep.findMany({
      where: {
        status: 'pending',
        scheduled_for: {
          lte: new Date(),
        },
      },
    });

    for (const step of dueSteps) {
      try {
        await this.executeStep(step.enrollment_id, step.step_id);
      } catch (error) {
        logger.error('Failed to execute step', {
          enrollment_id: step.enrollment_id,
          step_id: step.step_id,
          error,
        });
      }
    }
  }

  /**
   * Create welcome campaign
   */
  createWelcomeCampaign(): NurturingCampaign {
    return {
      id: 'welcome_series',
      name: 'Welcome Series',
      description: 'Welcome new leads with educational content',
      trigger: {
        type: 'lead_created',
      },
      steps: [
        {
          id: 'welcome_email',
          order: 1,
          delay_days: 0,
          action_type: 'send_email',
          action_config: {
            template: 'welcome',
            subject: 'Welcome! Here's what to expect',
          },
        },
        {
          id: 'educational_content',
          order: 2,
          delay_days: 3,
          action_type: 'send_email',
          action_config: {
            template: 'educational',
            subject: 'Top tips to get started',
          },
        },
        {
          id: 'case_study',
          order: 3,
          delay_days: 7,
          action_type: 'send_email',
          action_config: {
            template: 'case_study',
            subject: 'See how others succeed',
          },
        },
        {
          id: 'sales_outreach',
          order: 4,
          delay_days: 14,
          action_type: 'notify_sales',
          action_config: {
            message: 'Lead has completed welcome series - ready for outreach',
          },
        },
      ],
      status: 'active',
      created_at: new Date(),
    };
  }
}

export default LeadNurturingEngine;
