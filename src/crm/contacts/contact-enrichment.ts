/**
 * Contact Enrichment
 * Purpose: Enrich contact data from external sources
 * Description: Data enrichment, company lookup, social profiles
 */

import { logger } from '@/lib/logger';
import axios from 'axios';
import { ContactManager, Contact } from './contact-manager';

export interface EnrichmentResult {
  enriched: boolean;
  data?: Partial<Contact>;
  source: string;
  confidence_score?: number;
}

export class ContactEnrichment {
  private contactManager: ContactManager;

  constructor(contactManager: ContactManager) {
    this.contactManager = contactManager;
  }

  /**
   * Enrich contact from email
   */
  async enrichFromEmail(email: string): Promise<EnrichmentResult> {
    logger.info('Enriching contact from email', { email });

    try {
      // Use Clearbit, FullContact, or similar service
      const enrichedData = await this.fetchFromClearbit(email);

      if (enrichedData) {
        return {
          enriched: true,
          data: enrichedData,
          source: 'clearbit',
          confidence_score: 0.95,
        };
      }

      return {
        enriched: false,
        source: 'none',
      };
    } catch (error) {
      logger.error('Enrichment failed', { email, error });
      return {
        enriched: false,
        source: 'error',
      };
    }
  }

  /**
   * Fetch data from Clearbit
   */
  private async fetchFromClearbit(email: string): Promise<Partial<Contact> | null> {
    const apiKey = process.env.CLEARBIT_API_KEY;
    if (!apiKey) {
      logger.warn('Clearbit API key not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `https://person.clearbit.com/v2/people/find`,
        {
          params: { email },
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const person = response.data;

      return {
        first_name: person.name?.givenName,
        last_name: person.name?.familyName,
        title: person.employment?.title,
        company: person.employment?.name,
        address: person.geo ? {
          city: person.geo.city,
          state: person.geo.state,
          country: person.geo.country,
        } : undefined,
        social_profiles: {
          linkedin: person.linkedin?.handle,
          twitter: person.twitter?.handle,
          facebook: person.facebook?.handle,
        },
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Person not found
      }
      throw error;
    }
  }

  /**
   * Enrich company data
   */
  async enrichCompany(domain: string): Promise<any> {
    logger.info('Enriching company data', { domain });

    const apiKey = process.env.CLEARBIT_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://company.clearbit.com/v2/companies/find`,
        {
          params: { domain },
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      return {
        name: response.data.name,
        domain: response.data.domain,
        industry: response.data.category?.industry,
        employees: response.data.metrics?.employees,
        revenue: response.data.metrics?.estimatedAnnualRevenue,
        description: response.data.description,
        location: {
          city: response.data.geo?.city,
          state: response.data.geo?.state,
          country: response.data.geo?.country,
        },
        social_profiles: {
          linkedin: response.data.linkedin?.handle,
          twitter: response.data.twitter?.handle,
          facebook: response.data.facebook?.handle,
        },
      };
    } catch (error) {
      logger.error('Company enrichment failed', { domain, error });
      return null;
    }
  }

  /**
   * Enrich and update contact
   */
  async enrichAndUpdate(contactId: number): Promise<Contact> {
    const contact = await this.contactManager.getContact(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    logger.info('Enriching and updating contact', { contact_id: contactId });

    const enrichment = await this.enrichFromEmail(contact.email);

    if (enrichment.enriched && enrichment.data) {
      // Only update empty fields
      const updates: Partial<Contact> = {};

      if (!contact.first_name && enrichment.data.first_name) {
        updates.first_name = enrichment.data.first_name;
      }
      if (!contact.last_name && enrichment.data.last_name) {
        updates.last_name = enrichment.data.last_name;
      }
      if (!contact.company && enrichment.data.company) {
        updates.company = enrichment.data.company;
      }
      if (!contact.title && enrichment.data.title) {
        updates.title = enrichment.data.title;
      }
      if (!contact.social_profiles && enrichment.data.social_profiles) {
        updates.social_profiles = enrichment.data.social_profiles;
      }

      if (Object.keys(updates).length > 0) {
        return this.contactManager.updateContact(contactId, updates);
      }
    }

    return contact;
  }

  /**
   * Bulk enrich contacts
   */
  async bulkEnrich(contactIds: number[]): Promise<void> {
    logger.info('Bulk enriching contacts', { count: contactIds.length });

    for (const contactId of contactIds) {
      try {
        await this.enrichAndUpdate(contactId);
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Failed to enrich contact', { contact_id: contactId, error });
      }
    }
  }

  /**
   * Find similar contacts
   */
  async findSimilarContacts(contactId: number): Promise<Contact[]> {
    const contact = await this.contactManager.getContact(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Find contacts from same company
    if (contact.company) {
      const { contacts } = await this.contactManager.searchContacts({
        company: contact.company,
      });

      return contacts.filter(c => c.id !== contactId);
    }

    return [];
  }
}

export default ContactEnrichment;
