/**
 * Real-time Events
 * Purpose: Track and broadcast events in real-time
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '@/lib/logger';

export class RealTimeEvents {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  trackEvent(event: string, data: any): void {
    logger.debug('Real-time event', { event, data });
    this.io.emit(event, data);
  }

  trackPageView(page: string, userId?: number): void {
    this.trackEvent('page_view', { page, userId, timestamp: Date.now() });
  }

  trackOrder(orderId: number, amount: number): void {
    this.trackEvent('order_created', { orderId, amount, timestamp: Date.now() });
  }
}

export default RealTimeEvents;
