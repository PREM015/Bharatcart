/**
 * Pipeline Manager
 * Purpose: Manage sales pipelines and deal stages
 * Description: Pipeline CRUD, stage transitions, deal movement
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  is_default: boolean;
  created_at: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number; // 0-100, chance of closing
  type: 'open' | 'won' | 'lost';
  rotting_days?: number; // Days before deal is considered stale
}

export interface Deal {
  id?: number;
  name: string;
  contact_id: number;
  company_id?: number;
  pipeline_id: string;
  stage_id: string;
  amount: number;
  currency: string;
  probability: number;
  expected_close_date?: Date;
  owner_id: number;
  source?: string;
  description?: string;
  custom_fields?: Record<string, any>;
  status: 'open' | 'won' | 'lost';
  won_at?: Date;
  lost_at?: Date;
  lost_reason?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PipelineManager extends EventEmitter {
  private pipelines: Map<string, Pipeline> = new Map();

  constructor() {
    super();
    this.initializeDefaultPipeline();
  }

  /**
   * Initialize default sales pipeline
   */
  private initializeDefaultPipeline(): void {
    const defaultPipeline: Pipeline = {
      id: 'default_sales',
      name: 'Default Sales Pipeline',
      description: 'Standard B2B sales process',
      is_default: true,
      stages: [
        {
          id: 'lead',
          name: 'Lead',
          order: 1,
          probability: 10,
          type: 'open',
          rotting_days: 30,
        },
        {
          id: 'qualified',
          name: 'Qualified',
          order: 2,
          probability: 25,
          type: 'open',
          rotting_days: 30,
        },
        {
          id: 'demo',
          name: 'Demo Scheduled',
          order: 3,
          probability: 40,
          type: 'open',
          rotting_days: 14,
        },
        {
          id: 'proposal',
          name: 'Proposal Sent',
          order: 4,
          probability: 60,
          type: 'open',
          rotting_days: 21,
        },
        {
          id: 'negotiation',
          name: 'Negotiation',
          order: 5,
          probability: 80,
          type: 'open',
          rotting_days: 14,
        },
        {
          id: 'won',
          name: 'Closed Won',
          order: 6,
          probability: 100,
          type: 'won',
        },
        {
          id: 'lost',
          name: 'Closed Lost',
          order: 7,
          probability: 0,
          type: 'lost',
        },
      ],
      created_at: new Date(),
    };

    this.pipelines.set(defaultPipeline.id, defaultPipeline);
  }

  /**
   * Create new pipeline
   */
  async createPipeline(pipeline: Omit<Pipeline, 'created_at'>): Promise<Pipeline> {
    logger.info('Creating pipeline', { name: pipeline.name });

    const newPipeline: Pipeline = {
      ...pipeline,
      created_at: new Date(),
    };

    this.pipelines.set(pipeline.id, newPipeline);

    await prisma.pipeline.create({
      data: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        stages: JSON.stringify(pipeline.stages),
        is_default: pipeline.is_default,
        created_at: new Date(),
      },
    });

    return newPipeline;
  }

  /**
   * Create deal
   */
  async createDeal(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    logger.info('Creating deal', { name: deal.name, amount: deal.amount });

    const pipeline = this.pipelines.get(deal.pipeline_id);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stage = pipeline.stages.find(s => s.id === deal.stage_id);
    if (!stage) {
      throw new Error('Stage not found');
    }

    const created = await prisma.deal.create({
      data: {
        name: deal.name,
        contact_id: deal.contact_id,
        company_id: deal.company_id,
        pipeline_id: deal.pipeline_id,
        stage_id: deal.stage_id,
        amount: deal.amount,
        currency: deal.currency,
        probability: stage.probability,
        expected_close_date: deal.expected_close_date,
        owner_id: deal.owner_id,
        source: deal.source,
        description: deal.description,
        custom_fields: deal.custom_fields ? JSON.stringify(deal.custom_fields) : null,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const newDeal = this.mapToDeal(created);

    this.emit('deal_created', newDeal);

    return newDeal;
  }

  /**
   * Move deal to new stage
   */
  async moveDeal(dealId: number, newStageId: string): Promise<Deal> {
    logger.info('Moving deal', { deal_id: dealId, new_stage: newStageId });

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const pipeline = this.pipelines.get(deal.pipeline_id);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const oldStage = pipeline.stages.find(s => s.id === deal.stage_id);
    const newStage = pipeline.stages.find(s => s.id === newStageId);

    if (!newStage) {
      throw new Error('New stage not found');
    }

    // Update deal
    const updates: any = {
      stage_id: newStageId,
      probability: newStage.probability,
      updated_at: new Date(),
    };

    // Handle won/lost transitions
    if (newStage.type === 'won') {
      updates.status = 'won';
      updates.won_at = new Date();
    } else if (newStage.type === 'lost') {
      updates.status = 'lost';
      updates.lost_at = new Date();
    }

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: updates,
    });

    // Log stage change
    await this.logStageChange(dealId, oldStage?.id, newStageId);

    const updatedDeal = this.mapToDeal(updated);

    this.emit('deal_moved', {
      deal: updatedDeal,
      old_stage: oldStage?.id,
      new_stage: newStageId,
    });

    return updatedDeal;
  }

  /**
   * Update deal
   */
  async updateDeal(dealId: number, updates: Partial<Deal>): Promise<Deal> {
    logger.info('Updating deal', { deal_id: dealId });

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        name: updates.name,
        amount: updates.amount,
        expected_close_date: updates.expected_close_date,
        description: updates.description,
        custom_fields: updates.custom_fields ? JSON.stringify(updates.custom_fields) : undefined,
        updated_at: new Date(),
      },
    });

    const updatedDeal = this.mapToDeal(updated);

    this.emit('deal_updated', updatedDeal);

    return updatedDeal;
  }

  /**
   * Mark deal as won
   */
  async markDealWon(dealId: number): Promise<Deal> {
    logger.info('Marking deal as won', { deal_id: dealId });

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const pipeline = this.pipelines.get(deal.pipeline_id);
    const wonStage = pipeline?.stages.find(s => s.type === 'won');

    if (!wonStage) {
      throw new Error('Won stage not found');
    }

    return this.moveDeal(dealId, wonStage.id);
  }

  /**
   * Mark deal as lost
   */
  async markDealLost(dealId: number, reason: string): Promise<Deal> {
    logger.info('Marking deal as lost', { deal_id: dealId, reason });

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const pipeline = this.pipelines.get(deal.pipeline_id);
    const lostStage = pipeline?.stages.find(s => s.type === 'lost');

    if (!lostStage) {
      throw new Error('Lost stage not found');
    }

    await prisma.deal.update({
      where: { id: dealId },
      data: {
        lost_reason: reason,
      },
    });

    return this.moveDeal(dealId, lostStage.id);
  }

  /**
   * Get deals by stage
   */
  async getDealsByStage(pipelineId: string, stageId: string): Promise<Deal[]> {
    const deals = await prisma.deal.findMany({
      where: {
        pipeline_id: pipelineId,
        stage_id: stageId,
        status: 'open',
      },
      orderBy: { created_at: 'desc' },
    });

    return deals.map(d => this.mapToDeal(d));
  }

  /**
   * Get deals by owner
   */
  async getDealsByOwner(ownerId: number): Promise<Deal[]> {
    const deals = await prisma.deal.findMany({
      where: {
        owner_id: ownerId,
        status: 'open',
      },
      orderBy: { expected_close_date: 'asc' },
    });

    return deals.map(d => this.mapToDeal(d));
  }

  /**
   * Get rotting deals
   */
  async getRottingDeals(pipelineId: string): Promise<Deal[]> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      return [];
    }

    const rottingDeals: Deal[] = [];

    for (const stage of pipeline.stages) {
      if (stage.rotting_days && stage.type === 'open') {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - stage.rotting_days);

        const deals = await prisma.deal.findMany({
          where: {
            pipeline_id: pipelineId,
            stage_id: stage.id,
            status: 'open',
            updated_at: {
              lte: threshold,
            },
          },
        });

        rottingDeals.push(...deals.map(d => this.mapToDeal(d)));
      }
    }

    return rottingDeals;
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(pipelineId: string): Promise<any> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const stats = await Promise.all(
      pipeline.stages.map(async stage => {
        const [count, totalValue] = await Promise.all([
          prisma.deal.count({
            where: {
              pipeline_id: pipelineId,
              stage_id: stage.id,
              status: 'open',
            },
          }),
          prisma.deal.aggregate({
            where: {
              pipeline_id: pipelineId,
              stage_id: stage.id,
              status: 'open',
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        return {
          stage_id: stage.id,
          stage_name: stage.name,
          count,
          total_value: totalValue._sum.amount || 0,
          probability: stage.probability,
          weighted_value: ((totalValue._sum.amount || 0) * stage.probability) / 100,
        };
      })
    );

    return {
      pipeline_id: pipelineId,
      pipeline_name: pipeline.name,
      stages: stats,
      total_deals: stats.reduce((sum, s) => sum + s.count, 0),
      total_value: stats.reduce((sum, s) => sum + s.total_value, 0),
      weighted_value: stats.reduce((sum, s) => sum + s.weighted_value, 0),
    };
  }

  /**
   * Log stage change
   */
  private async logStageChange(
    dealId: number,
    oldStageId: string | undefined,
    newStageId: string
  ): Promise<void> {
    await prisma.dealStageHistory.create({
      data: {
        deal_id: dealId,
        old_stage_id: oldStageId,
        new_stage_id: newStageId,
        changed_at: new Date(),
      },
    });
  }

  /**
   * Map database record to Deal
   */
  private mapToDeal(record: any): Deal {
    return {
      id: record.id,
      name: record.name,
      contact_id: record.contact_id,
      company_id: record.company_id,
      pipeline_id: record.pipeline_id,
      stage_id: record.stage_id,
      amount: record.amount,
      currency: record.currency,
      probability: record.probability,
      expected_close_date: record.expected_close_date,
      owner_id: record.owner_id,
      source: record.source,
      description: record.description,
      custom_fields: record.custom_fields ? JSON.parse(record.custom_fields) : undefined,
      status: record.status,
      won_at: record.won_at,
      lost_at: record.lost_at,
      lost_reason: record.lost_reason,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}

export default PipelineManager;
