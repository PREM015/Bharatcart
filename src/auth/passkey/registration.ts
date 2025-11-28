/**
 * WebAuthn/Passkey Registration
 * Purpose: Passwordless authentication with passkeys
 */

import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class PasskeyRegistration {
  private rpName = 'Your E-commerce Store';
  private rpID = process.env.RP_ID || 'localhost';
  private origin = process.env.APP_URL || 'http://localhost:3000';

  async generateRegistrationOptions(userId: number, email: string): Promise<any> {
    logger.info('Generating passkey registration options', { userId });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        passkeys: {
          where: { is_active: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: userId.toString(),
      userName: email,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id, 'base64'),
        type: 'public-key',
        transports: JSON.parse(pk.transports || '[]'),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge temporarily
    await prisma.passkeyChallenge.create({
      data: {
        user_id: userId,
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    return options;
  }

  async verifyRegistration(
    userId: number,
    response: RegistrationResponseJSON
  ): Promise<{ success: boolean; credentialId?: string }> {
    logger.info('Verifying passkey registration', { userId });

    try {
      const challenge = await prisma.passkeyChallenge.findFirst({
        where: {
          user_id: userId,
          type: 'registration',
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!challenge) {
        throw new Error('Challenge not found or expired');
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Registration verification failed');
      }

      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      // Store passkey
      const passkey = await prisma.passkey.create({
        data: {
          user_id: userId,
          credential_id: Buffer.from(credentialID).toString('base64'),
          public_key: Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          transports: JSON.stringify(response.response.transports || []),
          is_active: true,
          created_at: new Date(),
        },
      });

      // Delete used challenge
      await prisma.passkeyChallenge.delete({
        where: { id: challenge.id },
      });

      logger.info('Passkey registered successfully', { userId, passkeyId: passkey.id });

      return {
        success: true,
        credentialId: passkey.credential_id,
      };
    } catch (error) {
      logger.error('Passkey registration failed', { error, userId });
      return { success: false };
    }
  }

  async listPasskeys(userId: number): Promise<any[]> {
    return await prisma.passkey.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: {
        id: true,
        credential_id: true,
        created_at: true,
        last_used_at: true,
      },
    });
  }

  async revokePasskey(userId: number, credentialId: string): Promise<boolean> {
    try {
      await prisma.passkey.updateMany({
        where: {
          user_id: userId,
          credential_id: credentialId,
        },
        data: {
          is_active: false,
          revoked_at: new Date(),
        },
      });

      return true;
    } catch (error) {
      logger.error('Passkey revocation failed', { error });
      return false;
    }
  }
}

export default PasskeyRegistration;
