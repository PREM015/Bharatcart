/**
 * Contact Manager
 * Purpose: Manage customer contacts and profiles
 * Description: CRUD operations, custom fields, segmentation
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface Contact {
  id?: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
  company?: string;
  title?: string;
  address?: ContactAddress;
  social_profiles?: SocialProfiles;
  custom_fields?: Record<string, any>;
  tags?: string[];
  source?: string;
  owner_id?: number;
  lifecycle_stage?: 'lead' | 'prospect' | 'customer' | 'evangelist' | 'other';
  created_at?: Date;
  updated_at?: Date;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

export interface ContactSearchFilters {
  email?: string;
  company?: string;
  tags?: string[];
  lifecycle_stage?: string;
  owner_id?: number;
  created_after?: Date;
  created_before?: Date;
}

export class ContactManager extends EventEmitter {
  /**
   * Create new contact
   */
  async createContact(data: Contact): Promise<Contact> {
    logger.info('Creating contact', { email: data.email });

    try {
      // Check for duplicate
      const existing = await this.findByEmail(data.email);
      if (existing) {
        throw new Error('Contact with this email already exists');
      }

      const contact = await prisma.contact.create({
        data: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          mobile: data.mobile,
          company: data.company,
          title: data.title,
          address: data.address ? JSON.stringify(data.address) : null,
          social_profiles: data.social_profiles ? JSON.stringify(data.social_profiles) : null,
          custom_fields: data.custom_fields ? JSON.stringify(data.custom_fields) : null,
          tags: data.tags ? JSON.stringify(data.tags) : null,
          source: data.source,
          owner_id: data.owner_id,
          lifecycle_stage: data.lifecycle_stage || 'lead',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const mappedContact = this.mapToContact(contact);

      this.emit('contact_created', mappedContact);

      // Track activity
      await this.logActivity(contact.id, 'contact_created', {
        source: data.source,
      });

      return mappedContact;
    } catch (error) {
      logger.error('Failed to create contact', { error });
      throw error;
    }
  }

  /**
   * Update contact
   */
  async updateContact(contactId: number, updates: Partial<Contact>): Promise<Contact> {
    logger.info('Updating contact', { contact_id: contactId });

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone: updates.phone,
        mobile: updates.mobile,
        company: updates.company,
        title: updates.title,
        address: updates.address ? JSON.stringify(updates.address) : undefined,
        social_profiles: updates.social_profiles ? JSON.stringify(updates.social_profiles) : undefined,
        custom_fields: updates.custom_fields ? JSON.stringify(updates.custom_fields) : undefined,
        tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
        lifecycle_stage: updates.lifecycle_stage,
        owner_id: updates.owner_id,
        updated_at: new Date(),
      },
    });

    const mappedContact = this.mapToContact(contact);

    this.emit('contact_updated', mappedContact);

    await this.logActivity(contactId, 'contact_updated', updates);

    return mappedContact;
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: number): Promise<Contact | null> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return null;
    }

    return this.mapToContact(contact);
  }

  /**
   * Find contact by email
   */
  async findByEmail(email: string): Promise<Contact | null> {
    const contact = await prisma.contact.findUnique({
      where: { email },
    });

    if (!contact) {
      return null;
    }

    return this.mapToContact(contact);
  }

  /**
   * Search contacts
   */
  async searchContacts(
    filters: ContactSearchFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{ contacts: Contact[]; total: number }> {
    const where: any = {};

    if (filters.email) where.email = { contains: filters.email };
    if (filters.company) where.company = { contains: filters.company };
    if (filters.lifecycle_stage) where.lifecycle_stage = filters.lifecycle_stage;
    if (filters.owner_id) where.owner_id = filters.owner_id;
    if (filters.created_after) where.created_at = { gte: filters.created_after };
    if (filters.created_before) {
      where.created_at = {
        ...where.created_at,
        lte: filters.created_before,
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      contacts: contacts.map(c => this.mapToContact(c)),
      total,
    };
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: number): Promise<void> {
    logger.info('Deleting contact', { contact_id: contactId });

    await prisma.contact.delete({
      where: { id: contactId },
    });

    this.emit('contact_deleted', { contact_id: contactId });
  }

  /**
   * Add tags to contact
   */
  async addTags(contactId: number, tags: string[]): Promise<void> {
    const contact = await this.getContact(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const existingTags = contact.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    await this.updateContact(contactId, { tags: newTags });
  }

  /**
   * Remove tags from contact
   */
  async removeTags(contactId: number, tags: string[]): Promise<void> {
    const contact = await this.getContact(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const existingTags = contact.tags || [];
    const newTags = existingTags.filter(tag => !tags.includes(tag));

    await this.updateContact(contactId, { tags: newTags });
  }

  /**
   * Get contact timeline
   */
  async getContactTimeline(contactId: number): Promise<any[]> {
    const activities = await prisma.contactActivity.findMany({
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return activities.map(a => ({
      id: a.id,
      type: a.activity_type,
      description: a.description,
      metadata: a.metadata ? JSON.parse(a.metadata) : null,
      created_at: a.created_at,
    }));
  }

  /**
   * Get contact statistics
   */
  async getContactStats(contactId: number): Promise<any> {
    const [
      totalDeals,
      totalRevenue,
      emailsSent,
      emailsOpened,
      callsLogged,
    ] = await Promise.all([
      prisma.deal.count({ where: { contact_id: contactId } }),
      prisma.deal.aggregate({
        where: { contact_id: contactId, status: 'won' },
        _sum: { amount: true },
      }),
      prisma.emailLog.count({ where: { contact_id: contactId } }),
      prisma.emailLog.count({
        where: { contact_id: contactId, opened: true },
      }),
      prisma.callLog.count({ where: { contact_id: contactId } }),
    ]);

    return {
      total_deals: totalDeals,
      total_revenue: totalRevenue._sum.amount || 0,
      emails_sent: emailsSent,
      emails_opened: emailsOpened,
      email_open_rate: emailsSent > 0 ? emailsOpened / emailsSent : 0,
      calls_logged: callsLogged,
    };
  }

  /**
   * Segment contacts
   */
  async segmentContacts(segmentRules: any): Promise<Contact[]> {
    // Advanced segmentation logic
    // Example: segment by lifecycle stage, tags, custom fields
    logger.info('Segmenting contacts', { rules: segmentRules });

    const where: any = {};

    if (segmentRules.lifecycle_stages) {
      where.lifecycle_stage = { in: segmentRules.lifecycle_stages };
    }

    if (segmentRules.tags) {
      // This would need proper JSON querying
      where.tags = { contains: segmentRules.tags[0] };
    }

    const contacts = await prisma.contact.findMany({ where });

    return contacts.map(c => this.mapToContact(c));
  }

  /**
   * Bulk import contacts
   */
  async bulkImportContacts(contacts: Contact[]): Promise<{
    imported: number;
    failed: number;
    errors: any[];
  }> {
    logger.info('Bulk importing contacts', { count: contacts.length });

    let imported = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const contact of contacts) {
      try {
        await this.createContact(contact);
        imported++;
      } catch (error: any) {
        failed++;
        errors.push({
          email: contact.email,
          error: error.message,
        });
      }
    }

    return { imported, failed, errors };
  }

  /**
   * Export contacts
   */
  async exportContacts(filters: ContactSearchFilters): Promise<Contact[]> {
    const { contacts } = await this.searchContacts(filters, 1, 10000);
    return contacts;
  }

  /**
   * Log contact activity
   */
  private async logActivity(
    contactId: number,
    activityType: string,
    metadata?: any
  ): Promise<void> {
    await prisma.contactActivity.create({
      data: {
        contact_id: contactId,
        activity_type: activityType,
        description: `Contact ${activityType.replace('_', ' ')}`,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date(),
      },
    });
  }

  /**
   * Map database record to Contact
   */
  private mapToContact(record: any): Contact {
    return {
      id: record.id,
      email: record.email,
      first_name: record.first_name,
      last_name: record.last_name,
      phone: record.phone,
      mobile: record.mobile,
      company: record.company,
      title: record.title,
      address: record.address ? JSON.parse(record.address) : undefined,
      social_profiles: record.social_profiles ? JSON.parse(record.social_profiles) : undefined,
      custom_fields: record.custom_fields ? JSON.parse(record.custom_fields) : undefined,
      tags: record.tags ? JSON.parse(record.tags) : undefined,
      source: record.source,
      owner_id: record.owner_id,
      lifecycle_stage: record.lifecycle_stage,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  /**
   * Merge contacts
   */
  async mergeContacts(primaryId: number, secondaryId: number): Promise<Contact> {
    logger.info('Merging contacts', { primary: primaryId, secondary: secondaryId });

    const [primary, secondary] = await Promise.all([
      this.getContact(primaryId),
      this.getContact(secondaryId),
    ]);

    if (!primary || !secondary) {
      throw new Error('One or both contacts not found');
    }

    // Merge data (primary takes precedence)
    const merged: Contact = {
      ...secondary,
      ...primary,
      tags: [...new Set([...(primary.tags || []), ...(secondary.tags || [])])],
      custom_fields: {
        ...secondary.custom_fields,
        ...primary.custom_fields,
      },
    };

    // Update primary with merged data
    const updated = await this.updateContact(primaryId, merged);

    // Transfer all relationships from secondary to primary
    await Promise.all([
      prisma.deal.updateMany({
        where: { contact_id: secondaryId },
        data: { contact_id: primaryId },
      }),
      prisma.contactActivity.updateMany({
        where: { contact_id: secondaryId },
        data: { contact_id: primaryId },
      }),
    ]);

    // Delete secondary contact
    await this.deleteContact(secondaryId);

    this.emit('contacts_merged', { primary: primaryId, secondary: secondaryId });

    return updated;
  }
}

export default ContactManager;
