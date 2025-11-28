/**
 * Session Manager
 * Purpose: Manage user sessions
 */

import crypto from 'crypto';
import { logger } from '@/lib/logger';
import type { Session, SessionData, SessionOptions } from './types';
import { RedisSessionStore } from './redis-store';

export class SessionManager {
  private store: RedisSessionStore;
  private defaultMaxAge = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    this.store = new RedisSessionStore();
  }

  async create(data: SessionData, options?: SessionOptions): Promise<Session> {
    const sessionId = this.generateSessionId();
    const maxAge = options?.maxAge || this.defaultMaxAge;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + maxAge * 1000);

    const session: Session = {
      id: sessionId,
      userId: data.userId,
      email: data.email,
      role: data.role,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now,
      expiresAt,
      metadata: data.metadata,
    };

    await this.store.set(sessionId, session, maxAge);

    logger.info('Session created', {
      sessionId,
      userId: data.userId,
      expiresAt,
    });

    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    return await this.store.get(sessionId);
  }

  async update(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const session = await this.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const updated = {
      ...session,
      ...data,
    };

    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    await this.store.set(sessionId, updated, ttl);

    logger.info('Session updated', { sessionId });
  }

  async destroy(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
    logger.info('Session destroyed', { sessionId });
  }

  async destroyAllForUser(userId: number): Promise<void> {
    const sessions = await this.store.getAllForUser(userId);
    
    for (const session of sessions) {
      await this.destroy(session.id);
    }

    logger.info('All user sessions destroyed', { userId, count: sessions.length });
  }

  async refresh(sessionId: string, maxAge?: number): Promise<Session> {
    const session = await this.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const newMaxAge = maxAge || this.defaultMaxAge;
    const expiresAt = new Date(Date.now() + newMaxAge * 1000);

    session.expiresAt = expiresAt;

    await this.store.set(sessionId, session, newMaxAge);

    logger.info('Session refreshed', { sessionId, expiresAt });

    return session;
  }

  async validate(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      await this.destroy(sessionId);
      return false;
    }

    return true;
  }

  async getActiveSessions(userId: number): Promise<Session[]> {
    return await this.store.getAllForUser(userId);
  }

  async cleanupExpired(): Promise<number> {
    return await this.store.cleanupExpired();
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export default SessionManager;
