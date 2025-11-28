/**
 * Lead Routing Engine
 * Purpose: Automatically route leads to the right sales rep
 * Description: Round-robin, territory-based, skill-based routing
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  assignment_type: 'round_robin' | 'territory' | 'skill_based' | 'load_balanced';
  target_users?: number[];
  enabled: boolean;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export interface LeadAssignment {
  lead_id: number;
  assigned_to: number;
  assigned_at: Date;
  assignment_reason: string;
  rule_id?: string;
}

export class LeadRoutingEngine extends EventEmitter {
  private routingRules: RoutingRule[] = [];
  private roundRobinIndexes: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRules(): void {
    this.routingRules = [
      {
        id: 'high_value_leads',
        name: 'High Value Leads to Senior Sales',
        priority: 1,
        conditions: [
          {
            field: 'lead_score',
            operator: 'greater_than',
            value: 80,
          },
        ],
        assignment_type: 'skill_based',
        target_users: [], // Will be populated with senior sales rep IDs
        enabled: true,
      },
      {
        id: 'enterprise_leads',
        name: 'Enterprise Leads',
        priority: 2,
        conditions: [
          {
            field: 'company_size',
            operator: 'greater_than',
            value: 500,
          },
        ],
        assignment_type: 'skill_based',
        target_users: [],
        enabled: true,
      },
      {
        id: 'territory_us_west',
        name: 'US West Territory',
        priority: 3,
        conditions: [
          {
            field: 'state',
            operator: 'in',
            value: ['CA', 'WA', 'OR', 'NV', 'AZ'],
          },
        ],
        assignment_type: 'territory',
        target_users: [],
        enabled: true,
      },
      {
        id: 'default_routing',
        name: 'Default Round Robin',
        priority: 999,
        conditions: [],
        assignment_type: 'round_robin',
        enabled: true,
      },
    ];
  }

  /**
   * Route lead to appropriate sales rep
   */
  async routeLead(leadId: number): Promise<LeadAssignment> {
    logger.info('Routing lead', { lead_id: leadId });

    // Get lead data
    const lead = await prisma.contact.findUnique({
      where: { id: leadId },
      include: {
        leadScore: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Find matching routing rule
    const matchingRule = this.findMatchingRule(lead);

    if (!matchingRule) {
      throw new Error('No routing rule matched');
    }

    // Assign based on rule
    const assignedTo = await this.assignByRule(matchingRule, lead);

    const assignment: LeadAssignment = {
      lead_id: leadId,
      assigned_to: assignedTo,
      assigned_at: new Date(),
      assignment_reason: matchingRule.name,
      rule_id: matchingRule.id,
    };

    // Save assignment
    await this.saveAssignment(assignment);

    // Update contact owner
    await prisma.contact.update({
      where: { id: leadId },
      data: { owner_id: assignedTo },
    });

    // Notify assigned user
    this.emit('lead_assigned', assignment);

    logger.info('Lead routed successfully', {
      lead_id: leadId,
      assigned_to: assignedTo,
      rule: matchingRule.name,
    });

    return assignment;
  }

  /**
   * Find matching routing rule
   */
  private findMatchingRule(lead: any): RoutingRule | null {
    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...this.routingRules]
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.evaluateConditions(rule.conditions, lead)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Evaluate routing conditions
   */
  private evaluateConditions(conditions: RoutingCondition[], lead: any): boolean {
    if (conditions.length === 0) {
      return true; // No conditions = always match (default rule)
    }

    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, lead);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  /**
   * Get field value from lead
   */
  private getFieldValue(field: string, lead: any): any {
    if (field === 'lead_score') {
      return lead.leadScore?.total_score || 0;
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return lead[parent]?.[child];
    }

    return lead[field];
  }

  /**
   * Assign lead based on routing rule
   */
  private async assignByRule(rule: RoutingRule, lead: any): Promise<number> {
    switch (rule.assignment_type) {
      case 'round_robin':
        return this.assignRoundRobin(rule);
      case 'territory':
        return this.assignByTerritory(rule, lead);
      case 'skill_based':
        return this.assignBySkill(rule, lead);
      case 'load_balanced':
        return this.assignLoadBalanced(rule);
      default:
        throw new Error(`Unknown assignment type: ${rule.assignment_type}`);
    }
  }

  /**
   * Round robin assignment
   */
  private async assignRoundRobin(rule: RoutingRule): Promise<number> {
    // Get active sales reps
    const salesReps = await this.getActiveSalesReps(rule.target_users);

    if (salesReps.length === 0) {
      throw new Error('No available sales reps');
    }

    // Get current index for this rule
    const currentIndex = this.roundRobinIndexes.get(rule.id) || 0;

    // Get next rep
    const assignedRep = salesReps[currentIndex % salesReps.length];

    // Update index
    this.roundRobinIndexes.set(rule.id, currentIndex + 1);

    return assignedRep.id;
  }

  /**
   * Territory-based assignment
   */
  private async assignByTerritory(rule: RoutingRule, lead: any): Promise<number> {
    // Get reps assigned to this territory
    const territoryReps = await this.getActiveSalesReps(rule.target_users);

    if (territoryReps.length === 0) {
      throw new Error('No reps available for territory');
    }

    // Round robin within territory
    const currentIndex = this.roundRobinIndexes.get(`territory_${rule.id}`) || 0;
    const assignedRep = territoryReps[currentIndex % territoryReps.length];
    this.roundRobinIndexes.set(`territory_${rule.id}`, currentIndex + 1);

    return assignedRep.id;
  }

  /**
   * Skill-based assignment
   */
  private async assignBySkill(rule: RoutingRule, lead: any): Promise<number> {
    // Get reps with required skills
    const skilledReps = await this.getActiveSalesReps(rule.target_users);

    if (skilledReps.length === 0) {
      throw new Error('No reps with required skills');
    }

    // Assign to rep with lowest current load
    const repLoads = await Promise.all(
      skilledReps.map(async rep => ({
        rep_id: rep.id,
        load: await this.getRepLoad(rep.id),
      }))
    );

    repLoads.sort((a, b) => a.load - b.load);

    return repLoads[0].rep_id;
  }

  /**
   * Load-balanced assignment
   */
  private async assignLoadBalanced(rule: RoutingRule): Promise<number> {
    const salesReps = await this.getActiveSalesReps(rule.target_users);

    if (salesReps.length === 0) {
      throw new Error('No available sales reps');
    }

    // Get current loads for all reps
    const repLoads = await Promise.all(
      salesReps.map(async rep => ({
        rep_id: rep.id,
        load: await this.getRepLoad(rep.id),
      }))
    );

    // Sort by load (ascending)
    repLoads.sort((a, b) => a.load - b.load);

    // Assign to rep with lowest load
    return repLoads[0].rep_id;
  }

  /**
   * Get active sales reps
   */
  private async getActiveSalesReps(targetUsers?: number[]): Promise<any[]> {
    const where: any = {
      role: 'sales_rep',
      is_active: true,
    };

    if (targetUsers && targetUsers.length > 0) {
      where.id = { in: targetUsers };
    }

    return prisma.user.findMany({ where });
  }

  /**
   * Get rep's current load (number of active leads)
   */
  private async getRepLoad(repId: number): Promise<number> {
    return prisma.contact.count({
      where: {
        owner_id: repId,
        lifecycle_stage: { in: ['lead', 'prospect'] },
      },
    });
  }

  /**
   * Save lead assignment
   */
  private async saveAssignment(assignment: LeadAssignment): Promise<void> {
    await prisma.leadAssignment.create({
      data: {
        lead_id: assignment.lead_id,
        assigned_to: assignment.assigned_to,
        assigned_at: assignment.assigned_at,
        assignment_reason: assignment.assignment_reason,
        rule_id: assignment.rule_id,
      },
    });
  }

  /**
   * Reassign lead
   */
  async reassignLead(leadId: number, newOwnerId: number, reason: string): Promise<void> {
    logger.info('Reassigning lead', { lead_id: leadId, new_owner: newOwnerId });

    const assignment: LeadAssignment = {
      lead_id: leadId,
      assigned_to: newOwnerId,
      assigned_at: new Date(),
      assignment_reason: reason,
    };

    await this.saveAssignment(assignment);

    await prisma.contact.update({
      where: { id: leadId },
      data: { owner_id: newOwnerId },
    });

    this.emit('lead_reassigned', assignment);
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    logger.info('Routing rule added', { rule_id: rule.id });
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): void {
    this.routingRules = this.routingRules.filter(r => r.id !== ruleId);
    logger.info('Routing rule removed', { rule_id: ruleId });
  }

  /**
   * Get routing statistics
   */
  async getRoutingStats(dateRange?: { start: Date; end: Date }): Promise<any> {
    const where: any = {};

    if (dateRange) {
      where.assigned_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const assignments = await prisma.leadAssignment.groupBy({
      by: ['assigned_to', 'rule_id'],
      where,
      _count: true,
    });

    return assignments.map(a => ({
      user_id: a.assigned_to,
      rule_id: a.rule_id,
      count: a._count,
    }));
  }
}

export default LeadRoutingEngine;
