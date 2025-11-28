/**
 * Canned Responses
 * Purpose: Pre-written responses for common questions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface CannedResponse {
  id?: number;
  category: string;
  title: string;
  content: string;
  shortcut?: string;
  tags?: string[];
}

export class CannedResponses {
  private responses: Map<string, CannedResponse>;

  constructor() {
    this.responses = new Map();
    this.initializeDefaults();
  }

  /**
   * Initialize default responses
   */
  private initializeDefaults(): void {
    const defaults: CannedResponse[] = [
      {
        category: 'greeting',
        title: 'Welcome Message',
        content: 'Thank you for contacting us! How can I help you today?',
        shortcut: '/greet',
      },
      {
        category: 'shipping',
        title: 'Shipping Times',
        content: 'Standard shipping takes 5-7 business days. Express shipping is available for 2-3 day delivery.',
        shortcut: '/ship',
      },
      {
        category: 'returns',
        title: 'Return Policy',
        content: 'We offer hassle-free returns within 30 days of purchase. Items must be unused and in original packaging.',
        shortcut: '/return',
      },
      {
        category: 'closing',
        title: 'Closing Message',
        content: 'Is there anything else I can help you with today?',
        shortcut: '/close',
      },
    ];

    defaults.forEach(r => this.add(r));
  }

  /**
   * Add response
   */
  add(response: CannedResponse): void {
    const id = response.shortcut || `${response.category}-${Date.now()}`;
    this.responses.set(id, response);
    logger.info('Canned response added', { id });
  }

  /**
   * Get response by shortcut
   */
  getByShortcut(shortcut: string): CannedResponse | undefined {
    return this.responses.get(shortcut);
  }

  /**
   * Get responses by category
   */
  getByCategory(category: string): CannedResponse[] {
    return Array.from(this.responses.values()).filter(
      r => r.category === category
    );
  }

  /**
   * Search responses
   */
  search(query: string): CannedResponse[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.responses.values()).filter(
      r =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.content.toLowerCase().includes(lowerQuery) ||
        r.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all responses
   */
  getAll(): CannedResponse[] {
    return Array.from(this.responses.values());
  }

  /**
   * Delete response
   */
  delete(shortcut: string): boolean {
    return this.responses.delete(shortcut);
  }

  /**
   * Replace variables in response
   */
  format(content: string, variables: Record<string, string>): string {
    let formatted = content;

    Object.entries(variables).forEach(([key, value]) => {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return formatted;
  }
}

export default CannedResponses;
