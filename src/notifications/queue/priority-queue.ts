/**
 * Priority Queue
 * Purpose: Handle high-priority notifications immediately
 */

import { logger } from '@/lib/logger';

export interface PriorityNotification {
  priority: 'critical' | 'high' | 'normal' | 'low';
  notification: any;
}

export class PriorityQueue {
  private queues: Map<string, any[]>;

  constructor() {
    this.queues = new Map([
      ['critical', []],
      ['high', []],
      ['normal', []],
      ['low', []],
    ]);
  }

  enqueue(item: PriorityNotification): void {
    const queue = this.queues.get(item.priority);
    if (queue) {
      queue.push(item.notification);
      logger.debug('Item enqueued', { priority: item.priority });
    }
  }

  dequeue(): any | null {
    for (const [priority, queue] of this.queues) {
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }
}

export default PriorityQueue;
