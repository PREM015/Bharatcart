/**
 * Magic Link Generator
 * Purpose: Generate secure passwordless login links
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface MagicLinkOptions {
  email: string;
  expiresIn?: number; // seconds
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export class MagicLinkGenerator {
  private readonly tokenLength = 32;
  private readonly defaultExpiry = 15 * 60; // 15 minutes

  async generate(options: MagicLinkOptions): Promise<{
    token: string;
    url: string;
    expiresAt: Date;
  }> {
    logger.info('Generating magic link', { email: options.email });

    const token = this.generateSecureToken();
    const expiresIn = options.expiresIn || this.defaultExpiry;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store token
    await prisma.magicLink.create({
      data: {
        email: options.email,
        token,
        expires_at: expiresAt,
        redirect_url: options.redirectUrl,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        created_at: new Date(),
      },
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/auth/magic-link/verify?token=${token}`;

    logger.info('Magic link generated', { email: options.email, expiresAt });

    return { token, url, expiresAt };
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  async invalidate(token: string): Promise<void> {
    await prisma.magicLink.updateMany({
      where: { token },
      data: {
        used: true,
        used_at: new Date(),
      },
    });

    logger.info('Magic link invalidated', { token });
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.magicLink.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });

    logger.info('Cleaned up expired magic links', { count: result.count });
    return result.count;
  }
}

export default MagicLinkGenerator;
