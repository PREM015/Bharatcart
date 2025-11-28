/**
 * Campaign Scheduler
 * Purpose: Automate campaign lifecycle
 * Description: Schedule activation, deactivation, and notifications
 */

import cron from 'node-cron';
import { logger } from '@/lib/logger';
import { CampaignManager } from './campaign-manager';
import { prisma } from '@/lib/prisma';

export class CampaignScheduler {
  private manager: CampaignManager;
  private jobs: Map<number, cron.ScheduledTask>;

  constructor() {
    this.manager = new CampaignManager();
    this.jobs = new Map();
  }

  /**
   * Initialize scheduler
   */
  async initialize(): Promise<void> {
    logger.info('Initializing campaign scheduler');

    // Check every minute for campaigns to activate/deactivate
    cron.schedule('* * * * *', async () => {
      await this.checkCampaigns();
    });

    logger.info('Campaign scheduler initialized');
  }

  /**
   * Check campaigns for status updates
   */
  private async checkCampaigns(): Promise<void> {
    const now = new Date();

    // Activate scheduled campaigns
    const scheduled = await this.manager.list({ status: 'scheduled' });
    for (const campaign of scheduled) {
      if (campaign.startDate <= now && campaign.endDate >= now) {
        await this.manager.activate(campaign.id!);
        logger.info('Campaign auto-activated', { id: campaign.id });
      }
    }

    // End active campaigns
    const active = await this.manager.list({ status: 'active' });
    for (const campaign of active) {
      if (campaign.endDate < now) {
        await this.manager.end(campaign.id!);
        logger.info('Campaign auto-ended', { id: campaign.id });
      }
    }
  }

  /**
   * Schedule campaign start
   */
  async scheduleStart(campaignId: number, startDate: Date): Promise<void> {
    const cronExpression = this.dateToCron(startDate);
    
    const task = cron.schedule(cronExpression, async () => {
      await this.manager.activate(campaignId);
      logger.info('Scheduled campaign started', { campaignId });
    });

    this.jobs.set(campaignId, task);
    logger.info('Campaign start scheduled', { campaignId, startDate });
  }

  /**
   * Schedule campaign end
   */
  async scheduleEnd(campaignId: number, endDate: Date): Promise<void> {
    const cronExpression = this.dateToCron(endDate);
    
    const task = cron.schedule(cronExpression, async () => {
      await this.manager.end(campaignId);
      logger.info('Scheduled campaign ended', { campaignId });
    });

    this.jobs.set(campaignId, task);
    logger.info('Campaign end scheduled', { campaignId, endDate });
  }

  /**
   * Cancel scheduled job
   */
  cancelSchedule(campaignId: number): void {
    const task = this.jobs.get(campaignId);
    if (task) {
      task.stop();
      this.jobs.delete(campaignId);
      logger.info('Campaign schedule cancelled', { campaignId });
    }
  }

  /**
   * Convert date to cron expression
   */
  private dateToCron(date: Date): string {
    return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
  }

  /**
   * Schedule reminder notifications
   */
  async scheduleReminders(campaignId: number): Promise<void> {
    const campaign = await this.manager.getById(campaignId);
    if (!campaign) return;

    // 24 hours before end
    const oneDayBefore = new Date(campaign.endDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    if (oneDayBefore > new Date()) {
      const cronExpr = this.dateToCron(oneDayBefore);
      cron.schedule(cronExpr, async () => {
        logger.info('Campaign ending soon reminder', { campaignId });
        // Send notifications
      });
    }
  }

  /**
   * Get scheduled jobs count
   */
  getScheduledCount(): number {
    return this.jobs.size;
  }
}

export default CampaignScheduler;
