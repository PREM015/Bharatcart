/**
 * Strategy Pattern
 * Purpose: Define family of algorithms, encapsulate each one, make them interchangeable
 * Use Case: Payment processing, shipping calculation, pricing strategies
 * 
 * Benefits:
 * - Avoid conditional statements
 * - Easy to add new strategies
 * - Algorithms can be swapped at runtime
 * - Open/Closed Principle
 * 
 * @example
 * ```typescript
 * const calculator = new ShippingCalculator(new StandardShipping());
 * const cost = calculator.calculate(weight, distance);
 * 
 * // Change strategy at runtime
 * calculator.setStrategy(new ExpressShipping());
 * ```
 */

import { logger } from '@/lib/logger';

/**
 * Shipping Strategy
 */
export interface IShippingStrategy {
  calculate(weight: number, distance: number): number;
  getEstimatedDays(): number;
  getName(): string;
}

export class StandardShipping implements IShippingStrategy {
  calculate(weight: number, distance: number): number {
    return weight * 0.5 + distance * 0.1;
  }

  getEstimatedDays(): number {
    return 7;
  }

  getName(): string {
    return 'Standard Shipping';
  }
}

export class ExpressShipping implements IShippingStrategy {
  calculate(weight: number, distance: number): number {
    return weight * 1.0 + distance * 0.2;
  }

  getEstimatedDays(): number {
    return 2;
  }

  getName(): string {
    return 'Express Shipping';
  }
}

export class OvernightShipping implements IShippingStrategy {
  calculate(weight: number, distance: number): number {
    return weight * 2.0 + distance * 0.5;
  }

  getEstimatedDays(): number {
    return 1;
  }

  getName(): string {
    return 'Overnight Shipping';
  }
}

export class ShippingCalculator {
  private strategy: IShippingStrategy;

  constructor(strategy: IShippingStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: IShippingStrategy): void {
    this.strategy = strategy;
    logger.info('Shipping strategy changed', { strategy: strategy.getName() });
  }

  calculate(weight: number, distance: number): {
    cost: number;
    estimatedDays: number;
    method: string;
  } {
    return {
      cost: this.strategy.calculate(weight, distance),
      estimatedDays: this.strategy.getEstimatedDays(),
      method: this.strategy.getName(),
    };
  }
}

/**
 * Discount Strategy
 */
export interface IDiscountStrategy {
  calculate(amount: number): number;
  getDescription(): string;
}

export class NoDiscount implements IDiscountStrategy {
  calculate(amount: number): number {
    return 0;
  }

  getDescription(): string {
    return 'No discount';
  }
}

export class PercentageDiscount implements IDiscountStrategy {
  constructor(private percent: number) {}

  calculate(amount: number): number {
    return amount * (this.percent / 100);
  }

  getDescription(): string {
    return `${this.percent}% off`;
  }
}

export class FixedDiscount implements IDiscountStrategy {
  constructor(private amount: number) {}

  calculate(amount: number): number {
    return Math.min(this.amount, amount);
  }

  getDescription(): string {
    return `$${this.amount} off`;
  }
}

export class BuyXGetYDiscount implements IDiscountStrategy {
  constructor(
    private buyQuantity: number,
    private getQuantity: number,
    private itemPrice: number
  ) {}

  calculate(amount: number): number {
    const totalItems = Math.floor(amount / this.itemPrice);
    const sets = Math.floor(totalItems / (this.buyQuantity + this.getQuantity));
    return sets * this.getQuantity * this.itemPrice;
  }

  getDescription(): string {
    return `Buy ${this.buyQuantity} Get ${this.getQuantity} Free`;
  }
}

export class DiscountCalculator {
  private strategy: IDiscountStrategy;

  constructor(strategy: IDiscountStrategy = new NoDiscount()) {
    this.strategy = strategy;
  }

  setStrategy(strategy: IDiscountStrategy): void {
    this.strategy = strategy;
  }

  calculate(amount: number): {
    original: number;
    discount: number;
    final: number;
    description: string;
  } {
    const discount = this.strategy.calculate(amount);

    return {
      original: amount,
      discount,
      final: amount - discount,
      description: this.strategy.getDescription(),
    };
  }
}

/**
 * Pricing Strategy
 */
export interface IPricingStrategy {
  calculate(basePrice: number, context: PricingContext): number;
}

export interface PricingContext {
  userType: 'guest' | 'regular' | 'premium' | 'wholesale';
  quantity: number;
  seasonalEvent?: string;
}

export class RegularPricing implements IPricingStrategy {
  calculate(basePrice: number, context: PricingContext): number {
    return basePrice;
  }
}

export class PremiumPricing implements IPricingStrategy {
  calculate(basePrice: number, context: PricingContext): number {
    // 10% discount for premium users
    return basePrice * 0.9;
  }
}

export class WholesalePricing implements IPricingStrategy {
  calculate(basePrice: number, context: PricingContext): number {
    // Volume-based discount
    if (context.quantity >= 100) return basePrice * 0.7;
    if (context.quantity >= 50) return basePrice * 0.8;
    if (context.quantity >= 10) return basePrice * 0.9;
    return basePrice;
  }
}

export class SeasonalPricing implements IPricingStrategy {
  calculate(basePrice: number, context: PricingContext): number {
    if (context.seasonalEvent === 'black-friday') {
      return basePrice * 0.5;
    }
    if (context.seasonalEvent === 'summer-sale') {
      return basePrice * 0.8;
    }
    return basePrice;
  }
}

export class PricingCalculator {
  calculate(basePrice: number, context: PricingContext): number {
    const strategies: IPricingStrategy[] = [];

    // Select strategies based on context
    if (context.userType === 'premium') {
      strategies.push(new PremiumPricing());
    } else if (context.userType === 'wholesale') {
      strategies.push(new WholesalePricing());
    }

    if (context.seasonalEvent) {
      strategies.push(new SeasonalPricing());
    }

    if (strategies.length === 0) {
      strategies.push(new RegularPricing());
    }

    // Apply all strategies
    let finalPrice = basePrice;
    for (const strategy of strategies) {
      finalPrice = Math.min(finalPrice, strategy.calculate(basePrice, context));
    }

    return finalPrice;
  }
}

export default ShippingCalculator;
