/**
 * WebAuthn/Passkey Authentication
 * Purpose: Authenticate users with passkeys
 */

import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/typescript-types';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class PasskeyAuthentication {
  private rpID = process.env.RP_ID || 'localhost';
  private origin = process.env.APP_URL || 'http://localhost:3000';

  async generateAuthenticationOptions(email: string): Promise<any> {
    logger.info('Generating passkey authentication options', { email });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        passkeys: {
          where: { is_active: true },
        },
      },
    });

    if (!user || user.passkeys.length === 0) {
      throw new Error('No passkeys found for user');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: user.passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64'),
        type: 'public-key',
        transports: JSON.parse(pk.transports || '[]'),
      })),
      userVerification: 'preferred',
    });

    // Store challenge
    await prisma.passkeyChallenge.create({
      data: {
        user_id: user.id,
        challenge: options.challenge,
        type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return options;
  }

  async verifyAuthentication(
    email: string,
    response: AuthenticationResponseJSON
  ): Promise<{ success: boolean; userId?: number }> {
    logger.info('Verifying passkey authentication', { email });

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          passkeys: {
            where: {
              credential_id: Buffer.from(response.rawId, 'base64').toString('base64'),
              is_active: true,
            },
          },
        },
      });

      if (!user || user.passkeys.length === 0) {
        throw new Error('Passkey not found');
      }

      const passkey = user.passkeys[0];

      const challenge = await prisma.passkeyChallenge.findFirst({
        where: {
          user_id: user.id,
          type: 'authentication',
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!challenge) {
        throw new Error('Challenge not found or expired');
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: Buffer.from(passkey.credential_id, 'base64'),
          credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
          counter: passkey.counter,
        },
      });

      if (!verification.verified) {
        throw new Error('Authentication verification failed');
      }

      // Update counter and last used
      await prisma.passkey.update({
        where: { id: passkey.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date(),
        },
      });

      // Delete used challenge
      await prisma.passkeyChallenge.delete({
        where: { id: challenge.id },
      });

      logger.info('Passkey authentication successful', { userId: user.id });

      return {
        success: true,
        userId: user.id,
      };
    } catch (error) {
      logger.error('Passkey authentication failed', { error, email });
      return { success: false };
    }
  }
}

export default PasskeyAuthentication;
