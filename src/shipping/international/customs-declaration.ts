/**
 * Customs Declaration
 * Purpose: Generate customs documentation for international shipments
 */

import { logger } from '@/lib/logger';

export interface CustomsItem {
  description: string;
  quantity: number;
  value: number;
  weight: number;
  originCountry: string;
  hsCode?: string;
}

export interface CustomsDeclaration {
  items: CustomsItem[];
  totalValue: number;
  currency: string;
  reasonForExport: 'sale' | 'gift' | 'sample' | 'return' | 'repair';
  invoiceNumber?: string;
  invoiceDate?: Date;
  termsOfSale?: 'DDP' | 'DDU' | 'DAP' | 'FOB' | 'CIF';
}

export class CustomsDeclarationGenerator {
  /**
   * Generate customs declaration
   */
  generate(declaration: CustomsDeclaration): any {
    logger.info('Generating customs declaration', {
      itemCount: declaration.items.length,
      totalValue: declaration.totalValue,
    });

    return {
      customsInfo: {
        contentType: this.getContentType(declaration.reasonForExport),
        contentsExplanation: this.getContentExplanation(declaration.items),
        restrictionType: 'NONE',
        customsItems: declaration.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          weight: item.weight,
          value: item.value,
          originCountry: item.originCountry,
          tariffNumber: item.hsCode,
        })),
        totalValue: declaration.totalValue,
        currency: declaration.currency,
        invoiceNumber: declaration.invoiceNumber,
        invoiceDate: declaration.invoiceDate?.toISOString(),
        termsOfTrade: declaration.termsOfSale,
      },
    };
  }

  /**
   * Get content type based on reason for export
   */
  private getContentType(reason: string): string {
    const contentTypes: Record<string, string> = {
      sale: 'MERCHANDISE',
      gift: 'GIFT',
      sample: 'SAMPLE',
      return: 'RETURNED_GOODS',
      repair: 'REPAIR_AND_RETURN',
    };

    return contentTypes[reason] || 'MERCHANDISE';
  }

  /**
   * Generate content explanation
   */
  private getContentExplanation(items: CustomsItem[]): string {
    if (items.length === 1) {
      return items[0].description;
    }

    return `${items.length} items: ${items.map(i => i.description).join(', ')}`;
  }

  /**
   * Validate customs declaration
   */
  validate(declaration: CustomsDeclaration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (declaration.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (declaration.totalValue <= 0) {
      errors.push('Total value must be greater than zero');
    }

    for (const item of declaration.items) {
      if (!item.description || item.description.trim() === '') {
        errors.push('Item description is required');
      }

      if (item.quantity <= 0) {
        errors.push('Item quantity must be greater than zero');
      }

      if (item.value <= 0) {
        errors.push('Item value must be greater than zero');
      }

      if (item.weight <= 0) {
        errors.push('Item weight must be greater than zero');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate commercial invoice
   */
  generateCommercialInvoice(declaration: CustomsDeclaration): any {
    return {
      invoiceNumber: declaration.invoiceNumber || `INV-${Date.now()}`,
      invoiceDate: declaration.invoiceDate || new Date(),
      items: declaration.items.map((item, index) => ({
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.value / item.quantity,
        totalPrice: item.value,
        hsCode: item.hsCode,
        originCountry: item.originCountry,
      })),
      subtotal: declaration.totalValue,
      total: declaration.totalValue,
      currency: declaration.currency,
      termsOfSale: declaration.termsOfSale || 'DAP',
    };
  }
}

export default CustomsDeclarationGenerator;
