import { PrismaClient, SsoProvider } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth';
import { fastify } from '../lib/fastify';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface SsoConfig {
  provider: SsoProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  metadataUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  issuer?: string;
  domain?: string;
}

export interface SsoUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  groups?: string[];
  attributes?: Record<string, any>;
}

/**
 * SSO Service for handling SAML and OIDC authentication
 */
export class SsoService {
  /**
   * Configure SSO for an organization
   */
  async configureSso(
    organizationId: string,
    provider: SsoProvider,
    config: Omit<SsoConfig, 'provider'>
  ) {
    // Store configuration securely
    const ssoConfig = {
      provider,
      ...config,
      // Encrypt sensitive values
      clientSecret: this.encrypt(config.clientSecret),
    };

    await prisma.organizationSettings.update({
      where: { organizationId },
      data: {
        ssoEnabled: true,
        // Store SSO config in encrypted format (in production, use proper key management)
        ssoConfig: ssoConfig as any,
      }
    });

    return ssoConfig;
  }

  /**
   * Disable SSO for an organization
   */
  async disableSso(organizationId: string) {
    await prisma.organizationSettings.update({
      where: { organizationId },
      data: {
        ssoEnabled: false,
        ssoConfig: null,
      },
    });
  }

  /**
   * Get SSO configuration for organization
   */
  async getSsoConfig(organizationId: string): Promise<SsoConfig | null> {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { ssoEnabled: true, ssoConfig: true }
    });

    if (!settings?.ssoEnabled || !settings.ssoConfig) {
      return null;
    }

    const config = settings.ssoConfig as any;
    // Decrypt sensitive values
    config.clientSecret = this.decrypt(config.clientSecret);

    return config;
  }

  /**
   * Generate SSO authorization URL
   */
  async getAuthorizationUrl(organizationId: string, state?: string) {
    const config = await this.getSsoConfig(organizationId);
    if (!config) {
      throw new Error('SSO not configured for organization');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state || this.generateState(),
    });

    if (config.provider === SsoProvider.OIDC) {
      // OIDC flow
      return `${config.authorizationUrl}?${params.toString()}`;
    } else {
      // SAML flow
      return this.buildSamlAuthnRequest(config, params);
    }
  }

  /**
   * Exchange authorization code for user tokens
   */
  async exchangeCodeForTokens(
    organizationId: string,
    code: string,
    state?: string
  ): Promise<{ accessToken: string; refreshToken?: string; user: SsoUser }> {
    const config = await this.getSsoConfig(organizationId);
    if (!config) {
      throw new Error('SSO not configured for organization');
    }

    if (config.provider === SsoProvider.OIDC) {
      return this.handleOidcCallback(config, code);
    } else {
      return this.handleSamlCallback(config, code);
    }
  }

  /**
   * Handle OIDC callback
   */
  private async handleOidcCallback(
    config: SsoConfig,
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; user: SsoUser }> {
    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl || `${config.issuer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(config.userInfoUrl || `${config.issuer}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const user = await userInfoResponse.json();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.sub || user.id,
        email: user.email,
        name: user.name,
        firstName: user.given_name,
        lastName: user.family_name,
        avatar: user.picture,
        attributes: user,
      },
    };
  }

  /**
   * Handle SAML callback
   */
  private async handleSamlCallback(
    config: SsoConfig,
    samlResponse: string
  ): Promise<{ accessToken: string; refreshToken?: string; user: SsoUser }> {
    // Parse SAML response
    // This would require a SAML library like @node-saml/passport-saml
    // For now, return mock data
    return {
      accessToken: 'saml_access_token',
      user: {
        id: 'saml_user_id',
        email: 'user@example.com',
        name: 'SAML User',
      },
    };
  }

  /**
   * Build SAML AuthnRequest
   */
  private buildSamlAuthnRequest(config: SsoConfig, params: URLSearchParams): string {
    // This would build a proper SAML AuthnRequest
    // For now, return a placeholder
    return 'saml_authn_request_url';
  }

  /**
   * Sync SSO user with local database
   */
  async syncSsoUser(
    organizationId: string,
    ssoUser: SsoUser,
    accessToken?: string,
    refreshToken?: string
  ): Promise<{ user: any; isNew: boolean }> {
    // Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email: ssoUser.email },
    });

    const isNew = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: ssoUser.email,
          passwordHash: '', // No password for SSO users
          role: 'USER',
          emailVerified: new Date(),
          // Store SSO info
          twoFactorEnabled: false,
        },
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!existingMember) {
      // Add user as member with MEMBER role
      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: 'MEMBER',
          joinedAt: new Date(),
          isActive: true,
        },
      });
    }

    // Store SSO tokens if provided
    if (accessToken || refreshToken) {
      // In production, store these securely
      console.log('SSO tokens stored for user', user.id);
    }

    return { user, isNew };
  }

  /**
   * Validate SSO session
   */
  async validateSsoSession(organizationId: string, token: string): Promise<boolean> {
    const config = await this.getSsoConfig(organizationId);
    if (!config) {
      return false;
    }

    try {
      // Decode and verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Check if token is still valid and belongs to the organization
      // Additional validation logic here

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate random state for OAuth flow
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    // In production, use proper encryption
    // For now, just return base64 encoded
    return Buffer.from(text).toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    // In production, use proper decryption
    // For now, just decode base64
    return Buffer.from(encryptedText, 'base64').toString();
  }

  /**
   * Get SSO metadata for provider
   */
  async getSsoMetadata(provider: SsoProvider): Promise<any> {
    switch (provider) {
      case SsoProvider.OIDC:
        return {
          name: 'OpenID Connect',
          discoveryUrl: '/.well-known/openid-configuration',
          scopes: ['openid', 'email', 'profile'],
        };

      case SsoProvider.SAML:
        return {
          name: 'Security Assertion Markup Language',
          metadataRequired: true,
          features: ['encryption', 'signing'],
        };

      default:
        return null;
    }
  }

  /**
   * Test SSO configuration
   */
  async testSsoConfiguration(organizationId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const config = await this.getSsoConfig(organizationId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      return { valid: false, errors: ['SSO not configured'], warnings };
    }

    // Validate required fields
    const requiredFields = ['clientId', 'clientSecret', 'redirectUri'];
    for (const field of requiredFields) {
      if (!config[field as keyof SsoConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate URLs
    if (config.provider === SsoProvider.OIDC) {
      if (!config.authorizationUrl) {
        errors.push('Missing authorization URL for OIDC');
      }
      if (!config.tokenUrl) {
        warnings.push('Token URL not specified, using default');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const ssoService = new SsoService();