/**
 * Observer Pattern (Pub/Sub)
 * Purpose: Define one-to-many dependency between objects
 * Use Case: Event-driven architecture, real-time notifications, webhooks
 * 
 * Benefits:
 * - Loose coupling between publisher and subscribers
 * - Dynamic subscriptions
 * - Easy to add new observers
 * - Supports event-driven architecture
 * 
 * @example
 * ```typescript
 * const eventBus = EventBus.getInstance();
 * 
 * // Subscribe to order events
 * eventBus.subscribe('order:created', async (order) => {
 *   await sendConfirmationEmail(order);
 *   await updateInventory(order);
 * });
 * 
 * // Publish event
 * eventBus.publish('order:created', orderData);
 * ```
 */

import { logger } from '@/lib/logger';

type EventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Event Bus (Observer Pattern)
 * Centralized event management system
 */
export class EventBus {
  private static instance: EventBus;
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to event
   */
  subscribe<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(handler);
    logger.debug('Event subscription added', { event });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, handler);
    };
  }

  /**
   * Unsubscribe from event
   */
  unsubscribe<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(event);
      }
      logger.debug('Event subscription removed', { event });
    }
  }

  /**
   * Publish event
   */
  async publish<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.subscribers.get(event);

    if (!handlers || handlers.size === 0) {
      logger.debug('No subscribers for event', { event });
      return;
    }

    logger.info('Publishing event', { event, subscriberCount: handlers.size });

    // Execute all handlers
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error('Event handler error', { event, error });
      }
    });

    await Promise.all(promises);
  }

  /**
   * Publish event synchronously
   */
  publishSync<T = any>(event: string, data: T): void {
    const handlers = this.subscribers.get(event);

    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        logger.error('Event handler error', { event, error });
      }
    });
  }

  /**
   * Get subscriber count for event
   */
  getSubscriberCount(event: string): number {
    return this.subscribers.get(event)?.size || 0;
  }

  /**
   * Clear all subscriptions for event
   */
  clear(event?: string): void {
    if (event) {
      this.subscribers.delete(event);
    } else {
      this.subscribers.clear();
    }
  }
}

/**
 * Domain Events
 * Predefined domain events with type safety
 */
export const DomainEvents = {
  // Order Events
  ORDER_CREATED: 'order:created',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_SHIPPED: 'order:shipped',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',

  // Payment Events
  PAYMENT_RECEIVED: 'payment:received',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_REFUNDED: 'payment:refunded',

  // User Events
  USER_REGISTERED: 'user:registered',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',

  // Product Events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCT_OUT_OF_STOCK: 'product:out_of_stock',

  // Inventory Events
  INVENTORY_LOW_STOCK: 'inventory:low_stock',
  INVENTORY_RESTOCKED: 'inventory:restocked',
} as const;

/**
 * Typed Event Emitter
 */
export interface OrderCreatedEvent {
  orderId: number;
  userId: number;
  total: number;
  items: Array<{ productId: number; quantity: number }>;
}

export interface PaymentReceivedEvent {
  orderId: number;
  amount: number;
  gateway: string;
  transactionId: string;
}

export class TypedEventBus {
  private eventBus = EventBus.getInstance();

  onOrderCreated(handler: EventHandler<OrderCreatedEvent>): () => void {
    return this.eventBus.subscribe(DomainEvents.ORDER_CREATED, handler);
  }

  onPaymentReceived(handler: EventHandler<PaymentReceivedEvent>): () => void {
    return this.eventBus.subscribe(DomainEvents.PAYMENT_RECEIVED, handler);
  }

  emitOrderCreated(data: OrderCreatedEvent): void {
    this.eventBus.publishSync(DomainEvents.ORDER_CREATED, data);
  }

  emitPaymentReceived(data: PaymentReceivedEvent): void {
    this.eventBus.publishSync(DomainEvents.PAYMENT_RECEIVED, data);
  }
}

export default EventBus;
