/**
 * Email Tracking System
 * Purpose: Track email opens, clicks, and engagement
 * Description: Email templates, tracking pixels, link tracking
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { ActivityTrackingSystem } from './activity-tracking';
import crypto from 'crypto';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables?: string[];
}

export interface TrackedEmail {
  id?: string;
  contact_id: number;
  user_id: number;
  template_id?: string;
  subject: string;
  body: string;
  sent_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  replied_at?: Date;
  bounced_at?: Date;
  tracking_id?: string;
  metadata?: Record<string, any>;
}

export class EmailTrackingSystem {
  private activityTracker: ActivityTrackingSystem;
  private trackingDomain: string;

  constructor(activityTracker: ActivityTrackingSystem, trackingDomain: string = 'track.example.com') {
    this.activityTracker = activityTracker;
    this.trackingDomain = trackingDomain;
  }

  /**
   * Send tracked email
   */
  async sendTrackedEmail(email: TrackedEmail): Promise<TrackedEmail> {
    logger.info('Sending tracked email', {
      contact_id: email.contact_id,
      subject: email.subject,
    });

    // Generate tracking ID
    const trackingId = this.generateTrackingId();

    // Insert tracking pixel
    const bodyWithTracking = this.insertTrackingPixel(email.body, trackingId);

    // Track links
    const bodyWithTrackedLinks = await this.trackLinks(bodyWithTracking, trackingId);

    // Send email (integrate with email service)
    await this.sendEmail({
      to: await this.getContactEmail(email.contact_id),
      subject: email.subject,
      html: bodyWithTrackedLinks,
    });

    const created = await prisma.emailLog.create({
      data: {
        id: trackingId,
        contact_id: email.contact_id,
        user_id: email.user_id,
        template_id: email.template_id,
        subject: email.subject,
        body: bodyWithTrackedLinks,
        sent_at: new Date(),
        tracking_id: trackingId,
        metadata: email.metadata ? JSON.stringify(email.metadata) : null,
      },
    });

    // Log as activity
    await this.activityTracker.logActivity({
      type: 'email',
      contact_id: email.contact_id,
      user_id: email.user_id,
      subject: email.subject,
      description: `Email sent: ${email.subject}`,
      direction: 'outbound',
      metadata: {
        tracking_id: trackingId,
        template_id: email.template_id,
      },
    });

    return this.mapToTrackedEmail(created);
  }

  /**
   * Track email open
   */
  async trackOpen(trackingId: string): Promise<void> {
    logger.info('Tracking email open', { tracking_id: trackingId });

    const existing = await prisma.emailLog.findUnique({
      where: { id: trackingId },
    });

    if (!existing || existing.opened_at) {
      return; // Already tracked or doesn't exist
    }

    await prisma.emailLog.update({
      where: { id: trackingId },
      data: {
        opened_at: new Date(),
      },
    });

    // Log activity
    await this.activityTracker.logActivity({
      type: 'email',
      contact_id: existing.contact_id,
      user_id: existing.user_id,
      subject: `Email opened: ${existing.subject}`,
      description: 'Contact opened email',
      metadata: {
        tracking_id: trackingId,
        event: 'open',
      },
    });
  }

  /**
   * Track link click
   */
  async trackClick(trackingId: string, linkUrl: string): Promise<void> {
    logger.info('Tracking link click', { tracking_id: trackingId, link: linkUrl });

    const existing = await prisma.emailLog.findUnique({
      where: { id: trackingId },
    });

    if (!existing) {
      return;
    }

    // Update first click time
    if (!existing.clicked_at) {
      await prisma.emailLog.update({
        where: { id: trackingId },
        data: {
          clicked_at: new Date(),
        },
      });
    }

    // Log click event
    await prisma.emailClickEvent.create({
      data: {
        email_log_id: trackingId,
        link_url: linkUrl,
        clicked_at: new Date(),
      },
    });

    // Log activity
    await this.activityTracker.logActivity({
      type: 'email',
      contact_id: existing.contact_id,
      user_id: existing.user_id,
      subject: `Email link clicked: ${existing.subject}`,
      description: `Clicked: ${linkUrl}`,
      metadata: {
        tracking_id: trackingId,
        event: 'click',
        link: linkUrl,
      },
    });
  }

  /**
   * Generate tracking ID
   */
  private generateTrackingId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Insert tracking pixel
   */
  private insertTrackingPixel(body: string, trackingId: string): string {
    const trackingPixel = `<img src="https://${this.trackingDomain}/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
    return body + trackingPixel;
  }

  /**
   * Track links in email
   */
  private async trackLinks(body: string, trackingId: string): Promise<string> {
    // Replace all links with tracked versions
    const linkRegex = /href="([^"]+)"/g;

    return body.replace(linkRegex, (match, url) => {
      const trackedUrl = `https://${this.trackingDomain}/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    });
  }

  /**
   * Get contact email
   */
  private async getContactEmail(contactId: number): Promise<string> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    return contact.email;
  }

  /**
   * Send email (integrate with email service)
   */
  private async sendEmail(email: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    logger.info('Sending email', { to: email.to, subject: email.subject });

    // Integrate with email service (SendGrid, AWS SES, Mailgun, etc.)
    // For now, just log
    logger.info('Email would be sent here', email);
  }

  /**
   * Get email statistics
   */
  async getEmailStats(userId?: number, dateRange?: { start: Date; end: Date }): Promise<any> {
    const where: any = {};

    if (userId) where.user_id = userId;
    if (dateRange) {
      where.sent_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [total, opened, clicked, replied] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, opened_at: { not: null } } }),
      prisma.emailLog.count({ where: { ...where, clicked_at: { not: null } } }),
      prisma.emailLog.count({ where: { ...where, replied_at: { not: null } } }),
    ]);

    return {
      total_sent: total,
      total_opened: opened,
      total_clicked: clicked,
      total_replied: replied,
      open_rate: total > 0 ? (opened / total) * 100 : 0,
      click_rate: total > 0 ? (clicked / total) * 100 : 0,
      reply_rate: total > 0 ? (replied / total) * 100 : 0,
    };
  }

  /**
   * Create email template
   */
  async createTemplate(template: EmailTemplate): Promise<EmailTemplate> {
    logger.info('Creating email template', { name: template.name });

    await prisma.emailTemplate.create({
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text,
        variables: template.variables ? JSON.stringify(template.variables) : null,
        created_at: new Date(),
      },
    });

    return template;
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: EmailTemplate, variables: Record<string, string>): string {
    let rendered = template.body_html;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    return rendered;
  }

  /**
   * Map database record to TrackedEmail
   */
  private mapToTrackedEmail(record: any): TrackedEmail {
    return {
      id: record.id,
      contact_id: record.contact_id,
      user_id: record.user_id,
      template_id: record.template_id,
      subject: record.subject,
      body: record.body,
      sent_at: record.sent_at,
      opened_at: record.opened_at,
      clicked_at: record.clicked_at,
      replied_at: record.replied_at,
      bounced_at: record.bounced_at,
      tracking_id: record.tracking_id,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
    };
  }
}

export default EmailTrackingSystem;
