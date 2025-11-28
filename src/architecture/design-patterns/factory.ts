/**
 * Factory Pattern
 * Purpose: Create objects without specifying exact class
 * Use Case: Creating different payment gateway instances, notification channels
 * 
 * Benefits:
 * - Encapsulates object creation
 * - Loose coupling
 * - Easy to extend with new types
 * - Single Responsibility Principle
 * 
 * @example
 * ```typescript
 * const factory = new PaymentGatewayFactory();
 * const stripe = factory.create('stripe');
 * const razorpay = factory.create('razorpay');
 * ```
 */

import { StripeGateway } from '@/payments/gateways/stripe';
import { RazorpayGateway } from '@/payments/gateways/razorpay';
import { PaytmGateway } from '@/payments/gateways/paytm';

export interface PaymentGateway {
  processPayment(amount: number, currency: string): Promise<any>;
  refund(transactionId: string, amount: number): Promise<any>;
  getTransactionStatus(transactionId: string): Promise<any>;
}

/**
 * Payment Gateway Factory
 * Creates payment gateway instances based on provider name
 */
export class PaymentGatewayFactory {
  private static instances: Map<string, PaymentGateway> = new Map();

  /**
   * Create payment gateway instance
   */
  static create(provider: string): PaymentGateway {
    // Return cached instance if exists (Singleton pattern combined)
    if (this.instances.has(provider)) {
      return this.instances.get(provider)!;
    }

    let gateway: PaymentGateway;

    switch (provider.toLowerCase()) {
      case 'stripe':
        gateway = new StripeGateway();
        break;
      case 'razorpay':
        gateway = new RazorpayGateway();
        break;
      case 'paytm':
        gateway = new PaytmGateway();
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    this.instances.set(provider, gateway);
    return gateway;
  }

  /**
   * Register custom payment gateway
   */
  static register(provider: string, gateway: PaymentGateway): void {
    this.instances.set(provider, gateway);
  }

  /**
   * Get all registered providers
   */
  static getProviders(): string[] {
    return Array.from(this.instances.keys());
  }
}

/**
 * Notification Channel Factory
 */
export interface NotificationChannel {
  send(recipient: string, message: string): Promise<boolean>;
}

export class NotificationChannelFactory {
  static create(channel: 'email' | 'sms' | 'push'): NotificationChannel {
    switch (channel) {
      case 'email':
        return {
          send: async (to, message) => {
            // Email implementation
            return true;
          },
        };
      case 'sms':
        return {
          send: async (to, message) => {
            // SMS implementation
            return true;
          },
        };
      case 'push':
        return {
          send: async (to, message) => {
            // Push notification implementation
            return true;
          },
        };
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }
}

/**
 * Abstract Factory Pattern
 * Creates families of related objects
 */
export interface UIFactory {
  createButton(): Button;
  createInput(): Input;
  createCard(): Card;
}

export interface Button {
  render(): string;
}

export interface Input {
  render(): string;
}

export interface Card {
  render(): string;
}

export class MaterialUIFactory implements UIFactory {
  createButton(): Button {
    return {
      render: () => '<button class="mui-button">Click</button>',
    };
  }

  createInput(): Input {
    return {
      render: () => '<input class="mui-input" />',
    };
  }

  createCard(): Card {
    return {
      render: () => '<div class="mui-card"></div>',
    };
  }
}

export class TailwindUIFactory implements UIFactory {
  createButton(): Button {
    return {
      render: () => '<button class="px-4 py-2 bg-blue-500">Click</button>',
    };
  }

  createInput(): Input {
    return {
      render: () => '<input class="border rounded px-3 py-2" />',
    };
  }

  createCard(): Card {
    return {
      render: () => '<div class="shadow rounded-lg p-4"></div>',
    };
  }
}

export default PaymentGatewayFactory;
