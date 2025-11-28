/**
 * Microsoft OAuth Provider
 * Purpose: Microsoft/Azure AD OAuth authentication
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class MicrosoftOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tenant: string;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || '';
    this.tenant = process.env.MICROSOFT_TENANT || 'common';
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: 'openid profile email',
      state,
    });

    return `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    logger.info('Exchanging Microsoft code for token');

    const response = await axios.post(
      `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data.access_token;
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }
}

export default MicrosoftOAuth;
