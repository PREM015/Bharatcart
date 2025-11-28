/**
 * Event Triggers
 * Purpose: Trigger notifications based on system events
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { NotificationQueue } from '../queue/notification-queue';

export class EventTriggers extends EventEmitter {
  private queue: NotificationQueue;

  constructor() {
    super();
    this.queue = new NotificationQueue();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.on('order:created', (data) => this.handleOrderCreated(data));
    this.on('order:shipped', (data) => this.handleOrderShipped(data));
    this.on('order:delivered', (data) => this.handleOrderDelivered(data));
    this.on('user:registered', (data) => this.handleUserRegistered(data));
  }

  private async handleOrderCreated(data: any): Promise<void> {
    logger.info('Order created event triggered', data);
    await this.queue.enqueue({
      id: `order-${data.orderId}`,
      type: 'email',
      recipient: data.userId,
      data: {
        template: 'order-confirmation',
        orderId: data.orderId,
      },
    });
  }

  private async handleOrderShipped(data: any): Promise<void> {
    logger.info('Order shipped event triggered', data);
    await this.queue.enqueue({
      id: `ship-${data.orderId}`,
      type: 'push',
      recipient: data.userId,
      data: {
        title: 'Order Shipped',
        body: 'Your order is on the way!',
      },
    });
  }

  private async handleOrderDelivered(data: any): Promise<void> {
    logger.info('Order delivered event triggered', data);
  }

  private async handleUserRegistered(data: any): Promise<void> {
    logger.info('User registered event triggered', data);
    await this.queue.enqueue({
      id: `welcome-${data.userId}`,
      type: 'email',
      recipient: data.userId,
      data: {
        template: 'welcome-email',
        userId: data.userId,
      },
    });
  }
}

export default EventTriggers;
