/**
 * Activity Tracking System
 * Purpose: Track all customer interactions and touchpoints
 * Description: Emails, calls, meetings, notes, tasks
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface Activity {
  id?: number;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'sms' | 'chat';
  contact_id?: number;
  deal_id?: number;
  user_id: number;
  subject?: string;
  description: string;
  direction?: 'inbound' | 'outbound';
  duration_minutes?: number;
  outcome?: string;
  scheduled_at?: Date;
  completed_at?: Date;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface ActivityStats {
  total_activities: number;
  activities_by_type: Record<string, number>;
  activities_by_day: Array<{ date: string; count: number }>;
  avg_response_time_hours?: number;
  most_active_user?: { user_id: number; count: number };
}

export class ActivityTrackingSystem extends EventEmitter {
  /**
   * Log activity
   */
  async logActivity(activity: Activity): Promise<Activity> {
    logger.info('Logging activity', {
      type: activity.type,
      contact_id: activity.contact_id,
    });

    const created = await prisma.activity.create({
      data: {
        type: activity.type,
        contact_id: activity.contact_id,
        deal_id: activity.deal_id,
        user_id: activity.user_id,
        subject: activity.subject,
        description: activity.description,
        direction: activity.direction,
        duration_minutes: activity.duration_minutes,
        outcome: activity.outcome,
        scheduled_at: activity.scheduled_at,
        completed_at: activity.completed_at,
        metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
        created_at: new Date(),
      },
    });

    const loggedActivity = this.mapToActivity(created);

    this.emit('activity_logged', loggedActivity);

    // Update contact last activity
    if (activity.contact_id) {
      await this.updateContactLastActivity(activity.contact_id);
    }

    return loggedActivity;
  }

  /**
   * Get contact activities
   */
  async getContactActivities(
    contactId: number,
    limit: number = 50
  ): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Get deal activities
   */
  async getDealActivities(dealId: number): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: { deal_id: dealId },
      orderBy: { created_at: 'desc' },
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Get user activities
   */
  async getUserActivities(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Activity[]> {
    const where: any = { user_id: userId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Get upcoming activities
   */
  async getUpcomingActivities(userId: number): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: {
        user_id: userId,
        scheduled_at: {
          gte: new Date(),
        },
        completed_at: null,
      },
      orderBy: { scheduled_at: 'asc' },
      take: 20,
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Get overdue activities
   */
  async getOverdueActivities(userId: number): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: {
        user_id: userId,
        scheduled_at: {
          lt: new Date(),
        },
        completed_at: null,
      },
      orderBy: { scheduled_at: 'asc' },
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Complete activity
   */
  async completeActivity(activityId: number, outcome?: string): Promise<Activity> {
    logger.info('Completing activity', { activity_id: activityId });

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        completed_at: new Date(),
        outcome,
      },
    });

    const activity = this.mapToActivity(updated);

    this.emit('activity_completed', activity);

    return activity;
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(
    userId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityStats> {
    const where: any = {};

    if (userId) where.user_id = userId;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [total, byType, byUser] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      prisma.activity.groupBy({
        by: ['user_id'],
        where,
        _count: true,
        orderBy: {
          _count: {
            user_id: 'desc',
          },
        },
        take: 1,
      }),
    ]);

    const activitiesByType: Record<string, number> = {};
    byType.forEach(item => {
      activitiesByType[item.type] = item._count;
    });

    return {
      total_activities: total,
      activities_by_type: activitiesByType,
      activities_by_day: await this.getActivitiesByDay(where),
      most_active_user: byUser[0]
        ? { user_id: byUser[0].user_id, count: byUser[0]._count }
        : undefined,
    };
  }

  /**
   * Get activities grouped by day
   */
  private async getActivitiesByDay(where: any): Promise<Array<{ date: string; count: number }>> {
    const activities = await prisma.activity.findMany({
      where,
      select: {
        created_at: true,
      },
    });

    const byDay = new Map<string, number>();

    activities.forEach(activity => {
      const date = activity.created_at.toISOString().split('T')[0];
      byDay.set(date, (byDay.get(date) || 0) + 1);
    });

    return Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Update contact last activity
   */
  private async updateContactLastActivity(contactId: number): Promise<void> {
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        last_activity_at: new Date(),
      },
    });
  }

  /**
   * Search activities
   */
  async searchActivities(query: string, limit: number = 50): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return activities.map(a => this.mapToActivity(a));
  }

  /**
   * Delete activity
   */
  async deleteActivity(activityId: number): Promise<void> {
    logger.info('Deleting activity', { activity_id: activityId });

    await prisma.activity.delete({
      where: { id: activityId },
    });

    this.emit('activity_deleted', { activity_id: activityId });
  }

  /**
   * Map database record to Activity
   */
  private mapToActivity(record: any): Activity {
    return {
      id: record.id,
      type: record.type,
      contact_id: record.contact_id,
      deal_id: record.deal_id,
      user_id: record.user_id,
      subject: record.subject,
      description: record.description,
      direction: record.direction,
      duration_minutes: record.duration_minutes,
      outcome: record.outcome,
      scheduled_at: record.scheduled_at,
      completed_at: record.completed_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      created_at: record.created_at,
    };
  }

  /**
   * Bulk log activities
   */
  async bulkLogActivities(activities: Activity[]): Promise<number> {
    logger.info('Bulk logging activities', { count: activities.length });

    let logged = 0;

    for (const activity of activities) {
      try {
        await this.logActivity(activity);
        logged++;
      } catch (error) {
        logger.error('Failed to log activity', { activity, error });
      }
    }

    return logged;
  }
}

export default ActivityTrackingSystem;
