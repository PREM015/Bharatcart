/**
 * Verification Token
 * Purpose: Email/phone verification tokens
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type TokenType = 'email_verification' | 'phone_verification' | 'password_reset';

export class VerificationToken {
  private tokenLength = 6; // For numeric codes
  private expiresIn = 15 * 60; // 15 minutes

  async generate(
    identifier: string,
    type: TokenType,
    numeric: boolean = true
  ): Promise<string> {
    const token = numeric
      ? this.generateNumericCode()
      : crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date(Date.now() + this.expiresIn * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier,
        token,
        type,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    });

    logger.info('Verification token generated', { identifier, type });
    return token;
  }

  async verify(identifier: string, token: string, type: TokenType): Promise<boolean> {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier,
        token,
        type,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!verificationToken) {
      return false;
    }

    if (verificationToken.expires_at < new Date()) {
      return false;
    }

    if (verificationToken.used) {
      return false;
    }

    // Mark as used
    await prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: {
        used: true,
        used_at: new Date(),
      },
    });

    logger.info('Verification token verified', { identifier, type });
    return true;
  }

  async resend(identifier: string, type: TokenType): Promise<string> {
    // Invalidate old tokens
    await prisma.verificationToken.updateMany({
      where: {
        identifier,
        type,
        used: false,
      },
      data: {
        used: true,
        used_at: new Date(),
      },
    });

    return this.generate(identifier, type);
  }

  private generateNumericCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });

    return result.count;
  }
}

export default VerificationToken;
