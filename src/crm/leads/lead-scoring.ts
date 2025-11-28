/**
 * Lead Scoring Engine
 * Purpose: Score and qualify leads based on behavior and attributes
 * Description: Scoring rules, demographic & behavioral scoring
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface LeadScore {
  contact_id: number;
  total_score: number;
  demographic_score: number;
  behavioral_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  qualification_status: 'qualified' | 'marketing_qualified' | 'sales_qualified' | 'unqualified';
  calculated_at: Date;
}

export interface ScoringRule {
  id: string;
  name: string;
  type: 'demographic' | 'behavioral';
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  points: number;
  enabled: boolean;
}

export class LeadScoringEngine {
  private scoringRules: ScoringRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default scoring rules
   */
  private initializeDefaultRules(): void {
    this.scoringRules = [
      // Demographic scoring
      {
        id: 'title_ceo',
        name: 'CEO/Founder title',
        type: 'demographic',
        condition: {
          field: 'title',
          operator: 'contains',
          value: ['CEO', 'Founder', 'President'],
        },
        points: 20,
        enabled: true,
      },
      {
        id: 'title_director',
        name: 'Director/VP title',
        type: 'demographic',
        condition: {
          field: 'title',
          operator: 'contains',
          value: ['Director', 'VP', 'Vice President'],
        },
        points: 15,
        enabled: true,
      },
      {
        id: 'company_size_large',
        name: 'Large company (500+ employees)',
        type: 'demographic',
        condition: {
          field: 'company_size',
          operator: 'greater_than',
          value: 500,
        },
        points: 15,
        enabled: true,
      },
      {
        id: 'industry_tech',
        name: 'Technology industry',
        type: 'demographic',
        condition: {
          field: 'industry',
          operator: 'equals',
          value: 'Technology',
        },
        points: 10,
        enabled: true,
      },

      // Behavioral scoring
      {
        id: 'email_opened',
        name: 'Opened marketing email',
        type: 'behavioral',
        condition: {
          field: 'email_opened',
          operator: 'greater_than',
          value: 0,
        },
        points: 5,
        enabled: true,
      },
      {
        id: 'email_clicked',
        name: 'Clicked link in email',
        type: 'behavioral',
        condition: {
          field: 'email_clicked',
          operator: 'greater_than',
          value: 0,
        },
        points: 10,
        enabled: true,
      },
      {
        id: 'website_visit',
        name: 'Visited website',
        type: 'behavioral',
        condition: {
          field: 'website_visits',
          operator: 'greater_than',
          value: 3,
        },
        points: 15,
        enabled: true,
      },
      {
        id: 'pricing_page',
        name: 'Visited pricing page',
        type: 'behavioral',
        condition: {
          field: 'viewed_page',
          operator: 'equals',
          value: '/pricing',
        },
        points: 20,
        enabled: true,
      },
      {
        id: 'demo_requested',
        name: 'Requested demo',
        type: 'behavioral',
        condition: {
          field: 'demo_requested',
          operator: 'equals',
          value: true,
        },
        points: 30,
        enabled: true,
      },
      {
        id: 'free_trial',
        name: 'Started free trial',
        type: 'behavioral',
        condition: {
          field: 'trial_started',
          operator: 'equals',
          value: true,
        },
        points: 25,
        enabled: true,
      },
    ];
  }

  /**
   * Calculate lead score
   */
  async calculateScore(contactId: number): Promise<LeadScore> {
    logger.info('Calculating lead score', { contact_id: contactId });

    // Get contact data
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get behavioral data
    const [emailStats, websiteStats, activities] = await Promise.all([
      this.getEmailStats(contactId),
      this.getWebsiteStats(contactId),
      this.getActivities(contactId),
    ]);

    let demographicScore = 0;
    let behavioralScore = 0;

    // Calculate demographic score
    for (const rule of this.scoringRules.filter(r => r.type === 'demographic' && r.enabled)) {
      if (this.evaluateRule(rule, { contact })) {
        demographicScore += rule.points;
      }
    }

    // Calculate behavioral score
    for (const rule of this.scoringRules.filter(r => r.type === 'behavioral' && r.enabled)) {
      if (this.evaluateRule(rule, { contact, emailStats, websiteStats, activities })) {
        behavioralScore += rule.points;
      }
    }

    const totalScore = demographicScore + behavioralScore;

    // Determine grade
    const grade = this.calculateGrade(totalScore);

    // Determine qualification status
    const qualificationStatus = this.determineQualification(totalScore, behavioralScore);

    const leadScore: LeadScore = {
      contact_id: contactId,
      total_score: totalScore,
      demographic_score: demographicScore,
      behavioral_score: behavioralScore,
      grade,
      qualification_status: qualificationStatus,
      calculated_at: new Date(),
    };

    // Save score
    await this.saveScore(leadScore);

    return leadScore;
  }

  /**
   * Evaluate scoring rule
   */
  private evaluateRule(rule: ScoringRule, data: any): boolean {
    const { field, operator, value } = rule.condition;
    let fieldValue: any;

    // Extract field value from data
    if (data.contact && data.contact[field]) {
      fieldValue = data.contact[field];
    } else if (data.emailStats && data.emailStats[field] !== undefined) {
      fieldValue = data.emailStats[field];
    } else if (data.websiteStats && data.websiteStats[field] !== undefined) {
      fieldValue = data.websiteStats[field];
    } else if (data.activities) {
      fieldValue = data.activities.some((a: any) => a[field] === value);
    }

    // Evaluate condition
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        if (Array.isArray(value)) {
          return value.some(v => String(fieldValue).toLowerCase().includes(v.toLowerCase()));
        }
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return false;
    }
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  /**
   * Determine qualification status
   */
  private determineQualification(
    totalScore: number,
    behavioralScore: number
  ): LeadScore['qualification_status'] {
    if (totalScore >= 70 && behavioralScore >= 30) {
      return 'sales_qualified';
    } else if (totalScore >= 50) {
      return 'marketing_qualified';
    } else if (totalScore >= 30) {
      return 'qualified';
    }
    return 'unqualified';
  }

  /**
   * Get email statistics
   */
  private async getEmailStats(contactId: number): Promise<any> {
    const stats = await prisma.emailLog.groupBy({
      by: ['contact_id'],
      where: { contact_id: contactId },
      _count: { id: true },
      _sum: {
        opened: true,
        clicked: true,
      },
    });

    return {
      email_opened: stats[0]?._sum.opened || 0,
      email_clicked: stats[0]?._sum.clicked || 0,
    };
  }

  /**
   * Get website statistics
   */
  private async getWebsiteStats(contactId: number): Promise<any> {
    const visits = await prisma.websiteVisit.count({
      where: { contact_id: contactId },
    });

    const pricingViews = await prisma.websiteVisit.count({
      where: {
        contact_id: contactId,
        page_url: { contains: '/pricing' },
      },
    });

    return {
      website_visits: visits,
      viewed_page: pricingViews > 0 ? '/pricing' : null,
    };
  }

  /**
   * Get activities
   */
  private async getActivities(contactId: number): Promise<any[]> {
    const activities = await prisma.contactActivity.findMany({
      where: { contact_id: contactId },
    });

    return activities.map(a => ({
      type: a.activity_type,
      demo_requested: a.activity_type === 'demo_requested',
      trial_started: a.activity_type === 'trial_started',
    }));
  }

  /**
   * Save lead score
   */
  private async saveScore(score: LeadScore): Promise<void> {
    await prisma.leadScore.upsert({
      where: { contact_id: score.contact_id },
      create: score,
      update: {
        total_score: score.total_score,
        demographic_score: score.demographic_score,
        behavioral_score: score.behavioral_score,
        grade: score.grade,
        qualification_status: score.qualification_status,
        calculated_at: score.calculated_at,
      },
    });
  }

  /**
   * Bulk score leads
   */
  async bulkScoreLeads(contactIds: number[]): Promise<void> {
    logger.info('Bulk scoring leads', { count: contactIds.length });

    for (const contactId of contactIds) {
      try {
        await this.calculateScore(contactId);
      } catch (error) {
        logger.error('Failed to score lead', { contact_id: contactId, error });
      }
    }
  }

  /**
   * Get top leads
   */
  async getTopLeads(limit: number = 50): Promise<LeadScore[]> {
    const scores = await prisma.leadScore.findMany({
      orderBy: { total_score: 'desc' },
      take: limit,
      where: {
        qualification_status: { in: ['sales_qualified', 'marketing_qualified'] },
      },
    });

    return scores;
  }

  /**
   * Add custom scoring rule
   */
  addScoringRule(rule: ScoringRule): void {
    this.scoringRules.push(rule);
  }

  /**
   * Remove scoring rule
   */
  removeScoringRule(ruleId: string): void {
    this.scoringRules = this.scoringRules.filter(r => r.id !== ruleId);
  }
}

export default LeadScoringEngine;
