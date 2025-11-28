/**
 * Duties and Taxes Calculator
 * Purpose: Calculate import duties and taxes for international shipments
 */

import { logger } from '@/lib/logger';

export interface DutiesRequest {
  originCountry: string;
  destinationCountry: string;
  items: Array<{
    value: number;
    hsCode: string;
    quantity: number;
  }>;
  shippingCost: number;
}

export interface DutiesResult {
  dutyAmount: number;
  taxAmount: number;
  totalCharges: number;
  breakdown: Array<{
    type: 'duty' | 'vat' | 'tax';
    description: string;
    rate: number;
    amount: number;
  }>;
}

export class DutiesCalculator {
  /**
   * Calculate duties and taxes
   */
  calculate(request: DutiesRequest): DutiesResult {
    logger.info('Calculating duties and taxes', {
      origin: request.originCountry,
      destination: request.destinationCountry,
    });

    const itemValue = request.items.reduce((sum, item) => sum + item.value, 0);
    const totalValue = itemValue + request.shippingCost;

    const breakdown: DutiesResult['breakdown'] = [];
    let dutyAmount = 0;
    let taxAmount = 0;

    // Calculate customs duty (simplified - varies by HS code)
    const dutyRate = this.getDutyRate(
      request.destinationCountry,
      request.items[0]?.hsCode
    );

    if (dutyRate > 0) {
      dutyAmount = totalValue * dutyRate;
      breakdown.push({
        type: 'duty',
        description: 'Customs Duty',
        rate: dutyRate * 100,
        amount: dutyAmount,
      });
    }

    // Calculate VAT/GST
    const taxRate = this.getTaxRate(request.destinationCountry);
    if (taxRate > 0) {
      taxAmount = (totalValue + dutyAmount) * taxRate;
      breakdown.push({
        type: 'vat',
        description: 'VAT/GST',
        rate: taxRate * 100,
        amount: taxAmount,
      });
    }

    return {
      dutyAmount,
      taxAmount,
      totalCharges: dutyAmount + taxAmount,
      breakdown,
    };
  }

  /**
   * Get duty rate by country and HS code
   */
  private getDutyRate(country: string, hsCode?: string): number {
    // Simplified rates - in production, use actual tariff database
    const rates: Record<string, number> = {
      US: 0.05,
      GB: 0.10,
      DE: 0.08,
      IN: 0.12,
      AU: 0.05,
    };

    return rates[country] || 0.10;
  }

  /**
   * Get tax rate by country
   */
  private getTaxRate(country: string): number {
    const rates: Record<string, number> = {
      US: 0, // No federal VAT
      GB: 0.20, // 20% VAT
      DE: 0.19, // 19% VAT
      FR: 0.20, // 20% VAT
      IN: 0.18, // 18% GST
      AU: 0.10, // 10% GST
      CA: 0.05, // 5% GST
    };

    return rates[country] || 0.20;
  }

  /**
   * Check if shipment is below de minimis threshold
   */
  isBelowDeMinimis(country: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      US: 800,
      GB: 135,
      DE: 150,
      AU: 1000,
      IN: 100,
    };

    const threshold = thresholds[country] || 0;
    return value < threshold;
  }

  /**
   * Estimate landed cost
   */
  estimateLandedCost(
    productValue: number,
    shippingCost: number,
    insuranceCost: number,
    destinationCountry: string
  ): number {
    const duties = this.calculate({
      originCountry: 'US',
      destinationCountry,
      items: [{ value: productValue, hsCode: '0000', quantity: 1 }],
      shippingCost,
    });

    return productValue + shippingCost + insuranceCost + duties.totalCharges;
  }
}

export default DutiesCalculator;
