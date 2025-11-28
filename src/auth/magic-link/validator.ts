/**
 * Magic Link Validator
 * Purpose: Validate and verify magic link tokens
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ValidationResult {
  valid: boolean;
  email?: string;
  redirectUrl?: string;
  error?: string;
}

export class MagicLinkValidator {
  async validate(token: string): Promise<ValidationResult> {
    logger.info('Validating magic link', { token: token.substring(0, 8) + '...' });

    try {
      const magicLink = await prisma.magicLink.findUnique({
        where: { token },
      });

      if (!magicLink) {
        return {
          valid: false,
          error: 'Invalid token',
        };
      }

      // Check if already used
      if (magicLink.used) {
        return {
          valid: false,
          error: 'Token already used',
        };
      }

      // Check if expired
      if (magicLink.expires_at < new Date()) {
        return {
          valid: false,
          error: 'Token expired',
        };
      }

      // Mark as used
      await prisma.magicLink.update({
        where: { token },
        data: {
          used: true,
          used_at: new Date(),
        },
      });

      logger.info('Magic link validated', { email: magicLink.email });

      return {
        valid: true,
        email: magicLink.email,
        redirectUrl: magicLink.redirect_url || undefined,
      };
    } catch (error) {
      logger.error('Magic link validation error', { error });
      return {
        valid: false,
        error: 'Validation error',
      };
    }
  }

  async getUserByToken(token: string): Promise<any | null> {
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    return magicLink?.user || null;
  }
}

export default MagicLinkValidator;
