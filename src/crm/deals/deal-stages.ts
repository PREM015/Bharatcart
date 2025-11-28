/**
 * Deal Stage Manager
 * Purpose: Advanced deal stage management and automation
 * Description: Stage validation, auto-progression, stage-specific actions
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface StageRequirement {
  field: string;
  required: boolean;
  validation?: (value: any) => boolean;
  error_message?: string;
}

export interface StageAction {
  type: 'send_email' | 'create_task' | 'notify_user' | 'update_field' | 'webhook';
  config: any;
  trigger: 'on_enter' | 'on_exit' | 'on_stay';
  delay_minutes?: number;
}

export interface DealStageConfig {
  stage_id: string;
  requirements: StageRequirement[];
  actions: StageAction[];
  max_duration_days?: number;
  auto_progress?: {
    enabled: boolean;
    condition: string;
    target_stage: string;
  };
}

export class DealStageManager extends EventEmitter {
  private stageConfigs: Map<string, DealStageConfig> = new Map();

  /**
   * Configure stage requirements and actions
   */
  configureStage(config: DealStageConfig): void {
    logger.info('Configuring deal stage', { stage_id: config.stage_id });
    this.stageConfigs.set(config.stage_id, config);
  }

  /**
   * Validate deal can move to stage
   */
  async validateStageTransition(
    dealId: number,
    targetStageId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const config = this.stageConfigs.get(targetStageId);
    if (!config) {
      return { valid: true, errors: [] };
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return { valid: false, errors: ['Deal not found'] };
    }

    const errors: string[] = [];

    for (const requirement of config.requirements) {
      if (requirement.required) {
        const value = this.getFieldValue(deal, requirement.field);

        if (!value) {
          errors.push(
            requirement.error_message ||
              `${requirement.field} is required for this stage`
          );
          continue;
        }

        if (requirement.validation && !requirement.validation(value)) {
          errors.push(
            requirement.error_message ||
              `${requirement.field} validation failed`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute stage actions
   */
  async executeStageActions(
    dealId: number,
    stageId: string,
    trigger: 'on_enter' | 'on_exit' | 'on_stay'
  ): Promise<void> {
    const config = this.stageConfigs.get(stageId);
    if (!config) {
      return;
    }

    const actions = config.actions.filter(a => a.trigger === trigger);

    for (const action of actions) {
      try {
        if (action.delay_minutes) {
          // Schedule for later
          await this.scheduleAction(dealId, action);
        } else {
          // Execute immediately
          await this.executeAction(dealId, action);
        }
      } catch (error) {
        logger.error('Failed to execute stage action', {
          deal_id: dealId,
          action_type: action.type,
          error,
        });
      }
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(dealId: number, action: StageAction): Promise<void> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return;
    }

    switch (action.type) {
      case 'send_email':
        await this.sendEmail(deal, action.config);
        break;

      case 'create_task':
        await this.createTask(deal, action.config);
        break;

      case 'notify_user':
        await this.notifyUser(deal, action.config);
        break;

      case 'update_field':
        await this.updateField(deal, action.config);
        break;

      case 'webhook':
        await this.callWebhook(deal, action.config);
        break;
    }

    this.emit('action_executed', { deal_id: dealId, action_type: action.type });
  }

  /**
   * Schedule action for later
   */
  private async scheduleAction(dealId: number, action: StageAction): Promise<void> {
    const executionTime = new Date();
    executionTime.setMinutes(executionTime.getMinutes() + (action.delay_minutes || 0));

    await prisma.scheduledStageAction.create({
      data: {
        deal_id: dealId,
        action_type: action.type,
        action_config: JSON.stringify(action.config),
        scheduled_for: executionTime,
        status: 'pending',
      },
    });
  }

  /**
   * Send email action
   */
  private async sendEmail(deal: any, config: any): Promise<void> {
    logger.info('Sending stage email', { deal_id: deal.id, template: config.template });

    await prisma.emailLog.create({
      data: {
        contact_id: deal.contact_id,
        deal_id: deal.id,
        template_id: config.template,
        subject: config.subject,
        sent_at: new Date(),
        status: 'sent',
      },
    });
  }

  /**
   * Create task action
   */
  private async createTask(deal: any, config: any): Promise<void> {
    logger.info('Creating stage task', { deal_id: deal.id });

    await prisma.task.create({
      data: {
        deal_id: deal.id,
        contact_id: deal.contact_id,
        title: config.title,
        description: config.description,
        assigned_to: config.assigned_to || deal.owner_id,
        due_date: new Date(Date.now() + (config.due_days || 1) * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    });
  }

  /**
   * Notify user action
   */
  private async notifyUser(deal: any, config: any): Promise<void> {
    logger.info('Notifying user', { deal_id: deal.id, user_id: config.user_id });

    this.emit('user_notification', {
      user_id: config.user_id || deal.owner_id,
      deal_id: deal.id,
      message: config.message,
      type: config.notification_type || 'info',
    });
  }

  /**
   * Update field action
   */
  private async updateField(deal: any, config: any): Promise<void> {
    logger.info('Updating deal field', {
      deal_id: deal.id,
      field: config.field,
    });

    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        [config.field]: config.value,
      },
    });
  }

  /**
   * Call webhook action
   */
  private async callWebhook(deal: any, config: any): Promise<void> {
    logger.info('Calling webhook', { deal_id: deal.id, url: config.url });

    const axios = require('axios');

    await axios.post(config.url, {
      event: 'deal_stage_change',
      deal,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get field value from deal
   */
  private getFieldValue(deal: any, field: string): any {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return deal[parent]?.[child];
    }
    return deal[field];
  }

  /**
   * Check for auto-progression
   */
  async checkAutoProgression(dealId: number): Promise<boolean> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return false;
    }

    const config = this.stageConfigs.get(deal.stage_id);
    if (!config?.auto_progress?.enabled) {
      return false;
    }

    // Evaluate auto-progression condition
    const shouldProgress = await this.evaluateCondition(
      deal,
      config.auto_progress.condition
    );

    if (shouldProgress) {
      logger.info('Auto-progressing deal', {
        deal_id: dealId,
        from_stage: deal.stage_id,
        to_stage: config.auto_progress.target_stage,
      });

      // Move deal to target stage
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          stage_id: config.auto_progress.target_stage,
          updated_at: new Date(),
        },
      });

      this.emit('deal_auto_progressed', {
        deal_id: dealId,
        target_stage: config.auto_progress.target_stage,
      });

      return true;
    }

    return false;
  }

  /**
   * Evaluate condition for auto-progression
   */
  private async evaluateCondition(deal: any, condition: string): Promise<boolean> {
    // Simple condition evaluation
    // In production, use a proper expression evaluator

    if (condition === 'demo_completed') {
      const demoTask = await prisma.task.findFirst({
        where: {
          deal_id: deal.id,
          title: { contains: 'demo' },
          status: 'completed',
        },
      });
      return !!demoTask;
    }

    if (condition === 'proposal_sent') {
      const proposalEmail = await prisma.emailLog.findFirst({
        where: {
          deal_id: deal.id,
          template_id: 'proposal',
        },
      });
      return !!proposalEmail;
    }

    return false;
  }

  /**
   * Get stage health metrics
   */
  async getStageHealth(pipelineId: string, stageId: string): Promise<any> {
    const config = this.stageConfigs.get(stageId);

    const deals = await prisma.deal.findMany({
      where: {
        pipeline_id: pipelineId,
        stage_id: stageId,
        status: 'open',
      },
    });

    const now = new Date();
    const metrics = {
      total_deals: deals.length,
      total_value: deals.reduce((sum, d) => sum + d.amount, 0),
      avg_age_days: 0,
      overdue_deals: 0,
      stuck_deals: 0,
      healthy_deals: 0,
    };

    if (deals.length === 0) {
      return metrics;
    }

    let totalAge = 0;

    for (const deal of deals) {
      const ageMs = now.getTime() - deal.updated_at.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      totalAge += ageDays;

      if (config?.max_duration_days && ageDays > config.max_duration_days) {
        metrics.overdue_deals++;
      }

      if (ageDays > 30) {
        metrics.stuck_deals++;
      } else {
        metrics.healthy_deals++;
      }
    }

    metrics.avg_age_days = Math.floor(totalAge / deals.length);

    return metrics;
  }

  /**
   * Initialize default stage configurations
   */
  initializeDefaultConfigs(): void {
    // Demo stage
    this.configureStage({
      stage_id: 'demo',
      requirements: [
        {
          field: 'expected_close_date',
          required: true,
          error_message: 'Expected close date is required',
        },
      ],
      actions: [
        {
          type: 'create_task',
          trigger: 'on_enter',
          config: {
            title: 'Schedule demo',
            description: 'Schedule product demo with prospect',
            due_days: 3,
          },
        },
      ],
      max_duration_days: 14,
      auto_progress: {
        enabled: true,
        condition: 'demo_completed',
        target_stage: 'proposal',
      },
    });

    // Proposal stage
    this.configureStage({
      stage_id: 'proposal',
      requirements: [
        {
          field: 'amount',
          required: true,
          validation: (value) => value > 0,
          error_message: 'Deal amount must be greater than 0',
        },
      ],
      actions: [
        {
          type: 'create_task',
          trigger: 'on_enter',
          config: {
            title: 'Send proposal',
            description: 'Prepare and send proposal to prospect',
            due_days: 2,
          },
        },
        {
          type: 'notify_user',
          trigger: 'on_enter',
          config: {
            message: 'Deal moved to Proposal stage - prepare proposal',
            notification_type: 'info',
          },
        },
      ],
      max_duration_days: 21,
      auto_progress: {
        enabled: true,
        condition: 'proposal_sent',
        target_stage: 'negotiation',
      },
    });
  }
}

export default DealStageManager;
