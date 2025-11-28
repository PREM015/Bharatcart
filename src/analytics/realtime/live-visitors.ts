/**
 * Live Visitors Tracker
 * Purpose: Track real-time active visitors
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

export class LiveVisitorsTracker {
  private redis: Redis;
  private keyPrefix = 'live:visitor:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async trackVisitor(visitorId: string, metadata?: any): Promise<void> {
    const key = `${this.keyPrefix}${visitorId}`;
    await this.redis.setex(key, 300, JSON.stringify({ ...metadata, timestamp: Date.now() }));
  }

  async getActiveVisitors(): Promise<number> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    return keys.length;
  }

  async getVisitorDetails(): Promise<any[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const visitors = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        visitors.push(JSON.parse(data));
      }
    }

    return visitors;
  }
}

export default LiveVisitorsTracker;
