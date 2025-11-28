/**
 * Refresh Token
 * Purpose: Generate and manage refresh tokens
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class RefreshToken {
  private tokenLength = 32;
  private expiresIn = 30 * 24 * 60 * 60; // 30 days

  async generate(userId: number, deviceId?: string): Promise<string> {
    const token = crypto.randomBytes(this.tokenLength).toString('hex');
    const expiresAt = new Date(Date.now() + this.expiresIn * 1000);

    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token,
        device_id: deviceId,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    });

    logger.info('Refresh token generated', { userId });
    return token;
  }

  async verify(token: string): Promise<{ userId: number; deviceId?: string } | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.expires_at < new Date()) {
      await this.revoke(token);
      return null;
    }

    if (refreshToken.revoked) {
      return null;
    }

    return {
      userId: refreshToken.user_id,
      deviceId: refreshToken.device_id || undefined,
    };
  }

  async revoke(token: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { token },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });

    logger.info('Refresh token revoked', { token });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: {
        revoked: true,
        revoked_at: new Date(),
      },
    });

    logger.info('All refresh tokens revoked', { userId });
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });

    logger.info('Expired refresh tokens cleaned up', { count: result.count });
    return result.count;
  }
}

export default RefreshToken;
