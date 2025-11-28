/**
 * Harmonized System (HS) Codes
 * Purpose: Manage and lookup HS codes for customs
 */

import { logger } from '@/lib/logger';

export interface HSCode {
  code: string;
  description: string;
  category: string;
  dutyRate?: number;
}

export class HarmonizedCodeManager {
  private codes: Map<string, HSCode>;

  constructor() {
    this.codes = new Map();
    this.initializeCommonCodes();
  }

  /**
   * Initialize common HS codes
   */
  private initializeCommonCodes(): void {
    const common: HSCode[] = [
      {
        code: '6203.42.40',
        description: "Men's/boys' trousers and shorts, of cotton",
        category: 'Clothing',
      },
      {
        code: '6204.62.40',
        description: "Women's/girls' trousers and shorts, of cotton",
        category: 'Clothing',
      },
      {
        code: '6109.10.00',
        description: 'T-shirts, cotton',
        category: 'Clothing',
      },
      {
        code: '8517.62.00',
        description: 'Smartphones',
        category: 'Electronics',
      },
      {
        code: '8471.30.01',
        description: 'Laptop computers',
        category: 'Electronics',
      },
      {
        code: '3304.99.50',
        description: 'Beauty and makeup preparations',
        category: 'Cosmetics',
      },
      {
        code: '6402.99.31',
        description: 'Sports footwear',
        category: 'Footwear',
      },
      {
        code: '9503.00.00',
        description: 'Toys',
        category: 'Toys',
      },
    ];

    common.forEach(code => this.codes.set(code.code, code));
  }

  /**
   * Lookup HS code
   */
  lookup(code: string): HSCode | undefined {
    return this.codes.get(code);
  }

  /**
   * Search HS codes by description
   */
  search(query: string): HSCode[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.codes.values()).filter(
      code =>
        code.description.toLowerCase().includes(lowerQuery) ||
        code.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get HS code by category
   */
  getByCategory(category: string): HSCode[] {
    return Array.from(this.codes.values()).filter(
      code => code.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Add custom HS code
   */
  add(code: HSCode): void {
    this.codes.set(code.code, code);
    logger.info('HS code added', { code: code.code });
  }

  /**
   * Validate HS code format
   */
  validate(code: string): boolean {
    // HS codes are 6-10 digits
    const regex = /^\d{4}\.\d{2}(\.\d{2})?$/;
    return regex.test(code);
  }

  /**
   * Suggest HS code based on product description
   */
  suggest(productDescription: string): HSCode[] {
    const keywords = productDescription.toLowerCase().split(' ');
    const matches: Array<{ code: HSCode; score: number }> = [];

    for (const code of this.codes.values()) {
      let score = 0;
      const codeText = (code.description + ' ' + code.category).toLowerCase();

      for (const keyword of keywords) {
        if (codeText.includes(keyword)) {
          score++;
        }
      }

      if (score > 0) {
        matches.push({ code, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.code);
  }
}

export default HarmonizedCodeManager;
