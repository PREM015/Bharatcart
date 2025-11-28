/**
 * Redis Session Store
 * Purpose: Store sessions in Redis
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import type { Session } from './types';

export class RedisSessionStore {
  private redis: Redis;
  private prefix = 'session:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_SESSION_DB || '1'),
    });
  }

  async set(sessionId: string, session: Session, ttl: number): Promise<void> {
    const key = this.getKey(sessionId);
    await this.redis.setex(key, ttl, JSON.stringify(session));
  }

  async get(sessionId: string): Promise<Session | null> {
    const key = this.getKey(sessionId);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    return this.deserialize(data);
  }

  async delete(sessionId: string): Promise<void> {
    const key = this.getKey(sessionId);
    await this.redis.del(key);
  }

  async getAllForUser(userId: number): Promise<Session[]> {
    const pattern = `${this.prefix}*`;
    const keys = await this.redis.keys(pattern);
    const sessions: Session[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = this.deserialize(data);
        if (session.userId === userId) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  async cleanupExpired(): Promise<number> {
    // Redis automatically removes expired keys
    return 0;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  private deserialize(data: string): Session {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  }
}

export default RedisSessionStore;
