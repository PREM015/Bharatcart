/**
 * Contact Deduplication
 * Purpose: Identify and merge duplicate contacts
 * Description: Fuzzy matching, merge strategies, duplicate prevention
 */

import { logger } from '@/lib/logger';
import { ContactManager, Contact } from './contact-manager';
import Fuse from 'fuse.js';

export interface DuplicateMatch {
  contact1: Contact;
  contact2: Contact;
  similarity_score: number;
  matching_fields: string[];
  suggested_action: 'merge' | 'review' | 'keep_separate';
}

export class ContactDeduplication {
  private contactManager: ContactManager;

  constructor(contactManager: ContactManager) {
    this.contactManager = contactManager;
  }

  /**
   * Find duplicate contacts
   */
  async findDuplicates(threshold: number = 0.8): Promise<DuplicateMatch[]> {
    logger.info('Finding duplicate contacts', { threshold });

    const { contacts } = await this.contactManager.searchContacts({}, 1, 10000);
    const duplicates: DuplicateMatch[] = [];

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const match = this.compareContacts(contacts[i], contacts[j]);

        if (match.similarity_score >= threshold) {
          duplicates.push(match);
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity_score - a.similarity_score);
  }

  /**
   * Compare two contacts
   */
  private compareContacts(contact1: Contact, contact2: Contact): DuplicateMatch {
    const matchingFields: string[] = [];
    let score = 0;

    // Email match (exact)
    if (contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
      matchingFields.push('email');
      score += 1.0;
      return {
        contact1,
        contact2,
        similarity_score: 1.0,
        matching_fields: matchingFields,
        suggested_action: 'merge',
      };
    }

    // Name similarity
    const name1 = `${contact1.first_name} ${contact1.last_name}`.toLowerCase();
    const name2 = `${contact2.first_name} ${contact2.last_name}`.toLowerCase();
    const nameSimilarity = this.calculateStringSimilarity(name1, name2);

    if (nameSimilarity > 0.8) {
      matchingFields.push('name');
      score += nameSimilarity * 0.5;
    }

    // Phone match
    if (contact1.phone && contact2.phone) {
      const phone1 = contact1.phone.replace(/\D/g, '');
      const phone2 = contact2.phone.replace(/\D/g, '');

      if (phone1 === phone2) {
        matchingFields.push('phone');
        score += 0.3;
      }
    }

    // Company match
    if (contact1.company && contact2.company) {
      const companySimilarity = this.calculateStringSimilarity(
        contact1.company.toLowerCase(),
        contact2.company.toLowerCase()
      );

      if (companySimilarity > 0.9) {
        matchingFields.push('company');
        score += 0.2;
      }
    }

    // Determine action
    let suggestedAction: 'merge' | 'review' | 'keep_separate';
    if (score >= 0.9) {
      suggestedAction = 'merge';
    } else if (score >= 0.6) {
      suggestedAction = 'review';
    } else {
      suggestedAction = 'keep_separate';
    }

    return {
      contact1,
      contact2,
      similarity_score: score,
      matching_fields: matchingFields,
      suggested_action: suggestedAction,
    };
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Auto-merge duplicates
   */
  async autoMergeDuplicates(threshold: number = 0.95): Promise<number> {
    logger.info('Auto-merging duplicates', { threshold });

    const duplicates = await this.findDuplicates(threshold);
    let mergedCount = 0;

    for (const duplicate of duplicates) {
      if (duplicate.suggested_action === 'merge') {
        try {
          await this.contactManager.mergeContacts(
            duplicate.contact1.id!,
            duplicate.contact2.id!
          );
          mergedCount++;
        } catch (error) {
          logger.error('Failed to merge contacts', {
            contact1: duplicate.contact1.id,
            contact2: duplicate.contact2.id,
            error,
          });
        }
      }
    }

    logger.info('Auto-merge completed', { merged_count: mergedCount });
    return mergedCount;
  }

  /**
   * Prevent duplicate creation
   */
  async checkForDuplicateBeforeCreate(contact: Contact): Promise<{
    is_duplicate: boolean;
    existing_contact?: Contact;
    similarity_score?: number;
  }> {
    // Check email first (exact match)
    const existingByEmail = await this.contactManager.findByEmail(contact.email);
    if (existingByEmail) {
      return {
        is_duplicate: true,
        existing_contact: existingByEmail,
        similarity_score: 1.0,
      };
    }

    // Fuzzy match by name and company
    const { contacts } = await this.contactManager.searchContacts({
      company: contact.company,
    });

    for (const existing of contacts) {
      const match = this.compareContacts(contact, existing);
      if (match.similarity_score >= 0.8) {
        return {
          is_duplicate: true,
          existing_contact: existing,
          similarity_score: match.similarity_score,
        };
      }
    }

    return {
      is_duplicate: false,
    };
  }
}

export default ContactDeduplication;
