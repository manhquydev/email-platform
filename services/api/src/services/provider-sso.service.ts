import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { appConfig } from '../config';

export class ProviderSsoService {
  /**
   * Generate a single-use SSO token for a mailbox
   */
  static async generateToken(
    providerId: string,
    tenantId: string,
    email: string,
    clientIp: string
  ) {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in DB
    await prisma.providerSsoToken.create({
      data: {
        token,
        email,
        providerId,
        tenantId,
        clientIp,
        expiresAt,
      },
    });

    // Construct SSO URL
    // Pointing to the API endpoint that handles the exchange/redirect
    return `${appConfig.webUrl}/auth/sso?token=${token}`;
  }

  /**
   * Validate and consume an SSO token
   */
  static async validateToken(token: string, clientIp: string) {
    const ssoToken = await prisma.providerSsoToken.findUnique({
      where: { token },
    });

    if (!ssoToken) {
      throw new Error('Invalid token');
    }

    if (ssoToken.usedAt) {
      throw new Error('Token already used');
    }

    if (ssoToken.expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    // IP Binding check
    if (ssoToken.clientIp !== clientIp) {
      // In production, might need to be careful with proxies, but requirement says REQUIRED
      throw new Error('IP address mismatch');
    }

    // Mark as used
    await prisma.providerSsoToken.update({
      where: { id: ssoToken.id },
      data: { usedAt: new Date() },
    });

    return ssoToken;
  }
}
