/**
 * Access Token
 * Purpose: Generate and verify JWT access tokens
 */

import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

export interface AccessTokenPayload {
  userId: number;
  email: string;
  role: string;
}

export class AccessToken {
  private secret: string;
  private expiresIn = '15m';

  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-secret-key';
  }

  generate(payload: AccessTokenPayload): string {
    const token = jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'your-app',
      audience: 'your-app-users',
    });

    logger.info('Access token generated', { userId: payload.userId });
    return token;
  }

  verify(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'your-app',
        audience: 'your-app-users',
      }) as AccessTokenPayload;

      return decoded;
    } catch (error) {
      logger.error('Access token verification failed', { error });
      throw new Error('Invalid token');
    }
  }

  decode(token: string): AccessTokenPayload | null {
    try {
      return jwt.decode(token) as AccessTokenPayload;
    } catch {
      return null;
    }
  }
}

export default AccessToken;
