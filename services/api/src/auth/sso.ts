import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { create as createXmlbuilder } from 'xmlbuilder';
import { parseString as parseXMLString } from 'xml2js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface SSOConfig {
  enabled: boolean;
  providers: SSOProvider[];
}

interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc';
  clientId: string;
  clientSecret: string;
  metadataUrl?: string;
  issuer?: string;
  jwksUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  redirectUri: string;
}

interface SAMLResponse {
  attributes: {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    department?: string;
    roles?: string[];
  };
  issuer?: string;
  audience?: string;
}

class SSOService {
  private providers: Map<string, SSOProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize SSO providers from environment variables
    const providers: SSOProvider[] = [];

    // Azure AD SAML
    if (process.env.AZURE_AD_ENABLED === 'true') {
      providers.push({
        id: 'azure-ad',
        name: 'Azure Active Directory',
        type: 'saml',
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        metadataUrl: process.env.AZURE_AD_METADATA_URL!,
        redirectUri: `${process.env.WEB_URL}/sso/azure-ad/callback`
      });
    }

    // Google Workspace SAML
    if (process.env.GOOGLE_WORKSPACE_ENABLED === 'true') {
      providers.push({
        id: 'google-workspace',
        name: 'Google Workspace',
        type: 'saml',
        clientId: process.env.GOOGLE_WORKSPACE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET!,
        metadataUrl: process.env.GOOGLE_WORKSPACE_METADATA_URL!,
        redirectUri: `${process.env.WEB_URL}/sso/google-workspace/callback`
      });
    }

    // Azure AD OIDC
    if (process.env.AZURE_AD_OIDC_ENABLED === 'true') {
      providers.push({
        id: 'azure-ad-oidc',
        name: 'Azure Active Directory (OIDC)',
        type: 'oidc',
        clientId: process.env.AZURE_AD_OIDC_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_OIDC_CLIENT_SECRET!,
        issuer: process.env.AZURE_AD_OIDC_ISSUER!,
        jwksUrl: process.env.AZURE_AD_OIDC_JWKS_URL!,
        authorizationEndpoint: process.env.AZURE_AD_OIDC_AUTH_URL!,
        tokenEndpoint: process.env.AZURE_AD_OIDC_TOKEN_URL!,
        userInfoEndpoint: process.env.AZURE_AD_OIDC_USER_INFO_URL!,
        redirectUri: `${process.env.WEB_URL}/sso/azure-ad-oidc/callback`
      });
    }

    // Okta OIDC
    if (process.env.OKTA_ENABLED === 'true') {
      providers.push({
        id: 'okta',
        name: 'Okta',
        type: 'oidc',
        clientId: process.env.OKTA_CLIENT_ID!,
        clientSecret: process.env.OKTA_CLIENT_SECRET!,
        issuer: process.env.OKTA_ISSUER!,
        jwksUrl: process.env.OKTA_JWKS_URL!,
        authorizationEndpoint: process.env.OKTA_AUTH_URL!,
        tokenEndpoint: process.env.OKTA_TOKEN_URL!,
        userInfoEndpoint: process.env.OKTA_USER_INFO_URL!,
        redirectUri: `${process.env.WEB_URL}/sso/okta/callback`
      });
    }

    // Store providers
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  getSSOConfig(): SSOConfig {
    return {
      enabled: this.providers.size > 0,
      providers: Array.from(this.providers.values())
    };
  }

  async initiateSSO(providerId: string, redirectUrl?: string): Promise<{
    authUrl: string;
    state: string;
    nonce: string;
  }> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`SSO provider not found: ${providerId}`);
    }

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state and nonce in cache
    await this.storeAuthState(state, {
      providerId,
      nonce,
      redirectUrl: redirectUrl || '/'
    });

    if (provider.type === 'saml') {
      return await this.initiateSAMLAuth(provider, state);
    } else {
      return await this.initiateOIDCAuth(provider, state, nonce);
    }
  }

  private async initiateSAMLAuth(provider: SSOProvider, state: string): Promise<{
    authUrl: string;
    state: string;
    nonce: string;
  }> {
    // Generate SAML AuthRequest
    const authRequest = await this.generateSAMLAuthRequest(provider);

    // Encode the request
    const encodedRequest = Buffer.from(authRequest).toString('base64');

    // Build the redirect URL
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
      RelayState: state
    });

    // Get SSO URL from metadata (simplified)
    const ssoUrl = provider.metadataUrl?.replace('/metadata', '/sso') || '';

    return {
      authUrl: `${ssoUrl}?${params.toString()}`,
      state,
      nonce: ''
    };
  }

  private async initiateOIDCAuth(provider: SSOProvider, state: string, nonce: string): Promise<{
    authUrl: string;
    state: string;
    nonce: string;
  }> {
    // Generate random code verifier for PKCE
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store code verifier
    await this.storeCodeVerifier(state, codeVerifier);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${provider.authorizationEndpoint}?${params.toString()}`;

    return {
      authUrl,
      state,
      nonce
    };
  }

  async handleSAMLCallback(
    providerId: string,
    samlResponse: string,
    state: string
  ): Promise<{
    user: any;
    token: string;
    isNewUser: boolean;
  }> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`SSO provider not found: ${providerId}`);
    }

    // Verify state
    const authState = await this.getAuthState(state);
    if (!authState || authState.providerId !== providerId) {
      throw new Error('Invalid state parameter');
    }

    // Parse and validate SAML response
    const parsedResponse = await this.parseSAMLResponse(samlResponse);
    await this.validateSAMLResponse(parsedResponse, provider);

    // Extract user attributes
    const userAttributes = parsedResponse.attributes;
    const email = userAttributes.email || userAttributes.emailaddress?.[0];

    if (!email) {
      throw new Error('Email not found in SAML response');
    }

    // Find or create user
    let isNewUser = false;
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user with SSO provider
      user = await prisma.user.create({
        data: {
          email,
          tier: 'ENTERPRISE',
          source: 'sso',
          emailVerified: true,
          settings: {
            ssoProvider: providerId,
            ssoId: userAttributes['nameid'] || userAttributes.email,
            department: userAttributes.department,
            roles: userAttributes.roles || []
          }
        }
      });
      isNewUser = true;
    } else {
      // Update user's SSO information
      await prisma.user.update({
        where: { id: user.id },
        data: {
          settings: {
            ...user.settings as any,
            ssoProvider: providerId,
            lastLoginAt: new Date().toISOString()
          }
        }
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        ssoProvider: providerId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Clean up state
    await this.deleteAuthState(state);

    return {
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        firstName: userAttributes.firstName || userAttributes.givenname?.[0],
        lastName: userAttributes.lastName || userAttributes.sn?.[0],
        name: userAttributes.name || userAttributes.displayName?.[0],
        department: userAttributes.department,
        roles: userAttributes.roles || []
      },
      token,
      isNewUser
    };
  }

  async handleOIDCCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<{
    user: any;
    token: string;
    isNewUser: boolean;
  }> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`SSO provider not found: ${providerId}`);
    }

    // Verify state
    const authState = await this.getAuthState(state);
    if (!authState || authState.providerId !== providerId) {
      throw new Error('Invalid state parameter');
    }

    // Get code verifier
    const codeVerifier = await this.getCodeVerifier(state);
    if (!codeVerifier) {
      throw new Error('Invalid code verifier');
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(
      provider,
      code,
      codeVerifier
    );

    // Validate ID token
    const idToken = await this.validateOIDCToken(tokenResponse.id_token, provider);

    // Extract user information
    const userInfo = await this.getOIDCUserInfo(
      provider,
      tokenResponse.access_token
    );

    // Find or create user
    let isNewUser = false;
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          tier: 'ENTERPRISE',
          source: 'sso',
          emailVerified: true,
          settings: {
            ssoProvider: providerId,
            ssoId: idToken.sub,
            givenName: userInfo.given_name,
            familyName: userInfo.family_name,
            name: userInfo.name,
            picture: userInfo.picture,
            locale: userInfo.locale,
            department: userInfo.department,
            roles: userInfo.roles || []
          }
        }
      });
      isNewUser = true;
    } else {
      // Update user information
      await prisma.user.update({
        where: { id: user.id },
        data: {
          settings: {
            ...user.settings as any,
            ssoProvider: providerId,
            lastLoginAt: new Date().toISOString(),
            picture: userInfo.picture
          }
        }
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        ssoProvider: providerId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Clean up state and code verifier
    await this.deleteAuthState(state);
    await this.deleteCodeVerifier(state);

    return {
      user,
      token,
      isNewUser
    };
  }

  private async parseSAMLResponse(samlResponse: string): Promise<SAMLResponse> {
    return new Promise((resolve, reject) => {
      parseXMLString(samlResponse, (err, result) => {
        if (err) {
          reject(new Error(`Failed to parse SAML response: ${err.message}`));
          return;
        }

        try {
          const response = result['samlp:Response'];
          const attributes: any = {};

          // Extract attributes from SAML response
          const assertion = response?.Assertion?.[0];
          if (!assertion) {
            throw new Error('No assertion found in SAML response');
          }

          const attributeStatement = assertion.AttributeStatement?.[0];
          if (attributeStatement) {
            for (const attribute of attributeStatement.Attribute || []) {
              const name = attribute.$.Name;
              const values = attribute.AttributeValue || [];
              if (values.length === 1) {
                attributes[name] = values[0]._;
              } else {
                attributes[name] = values.map(v => v._);
              }
            }
          }

          resolve({
            attributes,
            issuer: assertion.Issuer?.[0]?._,
            audience: assertion.Subject?.[0]?.NameID?.[0]?._
          });
        } catch (error) {
          reject(new Error(`Failed to extract SAML attributes: ${error.message}`));
        }
      });
    });
  }

  private async validateSAMLResponse(response: SAMLResponse, provider: SSOProvider): Promise<void> {
    // Validate issuer
    if (response.issuer !== provider.metadataUrl?.replace('/metadata', '')) {
      throw new Error('Invalid SAML response issuer');
    }

    // Validate audience
    if (response.audience !== provider.clientId) {
      throw new Error('Invalid SAML response audience');
    }

    // In production, validate signature and timestamps
  }

  private async exchangeCodeForTokens(
    provider: SSOProvider,
    code: string,
    codeVerifier: string
  ): Promise<any> {
    const response = await fetch(provider.tokenEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: provider.redirectUri,
        client_id: provider.clientId,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  private async validateOIDCToken(idToken: string, provider: SSOProvider): Promise<any> {
    // Get JWKS
    const jwksResponse = await fetch(provider.jwksUrl!);
    const jwks = await jwksResponse.json();

    // Decode JWT header
    const [header] = idToken.split('.');
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64').toString());

    // Find matching key
    const key = jwks.keys.find(k => k.kid === decodedHeader.kid);
    if (!key) {
      throw new Error('Key not found in JWKS');
    }

    // In production, use proper JWT verification library
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64').toString()
    );

    // Validate claims
    if (payload.iss !== provider.issuer) {
      throw new Error('Invalid token issuer');
    }

    if (payload.aud !== provider.clientId) {
      throw new Error('Invalid token audience');
    }

    if (Date.now() >= payload.exp * 1000) {
      throw new Error('Token has expired');
    }

    return payload;
  }

  private async getOIDCUserInfo(
    provider: SSOProvider,
    accessToken: string
  ): Promise<any> {
    const response = await fetch(provider.userInfoEndpoint!, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  private async generateSAMLAuthRequest(provider: SSOProvider): Promise<string> {
    const timestamp = new Date().toISOString();
    const uuid = uuidv4();

    const authRequest = createXmlbuilder('samlp:AuthnRequest', {
      xmlns: 'urn:oasis:names:tc:SAML:2.0:protocol',
      ID: `_${uuid}`,
      Version: '2.0',
      IssueInstant: timestamp,
      Destination: provider.metadataUrl?.replace('/metadata', '/sso'),
      ProtocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      AssertionConsumerServiceURL: provider.redirectUri
    })
      .ele('saml:Issuer', {}, 'tempmail-pro')
      .ele('samlp:NameIDPolicy', {
        Format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        AllowCreate: 'true'
      })
      .ele('samlp:RequestedAuthnContext', {
        Comparison: 'minimum',
        AuthnContextClassRef: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
      })
      .end({ pretty: false });

    return authRequest;
  }

  // Cache methods (simplified - use Redis in production)
  private authStates = new Map<string, any>();

  private async storeAuthState(state: string, data: any): Promise<void> {
    this.authStates.set(state, data);
    // Set expiration in production
  }

  private async getAuthState(state: string): Promise<any> {
    return this.authStates.get(state);
  }

  private async deleteAuthState(state: string): Promise<void> {
    this.authStates.delete(state);
  }

  private codeVerifiers = new Map<string, string>();

  private async storeCodeVerifier(state: string, codeVerifier: string): Promise<void> {
    this.codeVerifiers.set(state, codeVerifier);
  }

  private async getCodeVerifier(state: string): Promise<string | null> {
    return this.codeVerifiers.get(state) || null;
  }

  private async deleteCodeVerifier(state: string): Promise<void> {
    this.codeVerifiers.delete(state);
  }

  // JIT provisioning
  async handleJITProvisioning(userAttributes: any, providerId: string): Promise<any> {
    // Check if user already exists
    const email = userAttributes.email || userAttributes.emailaddress?.[0];
    if (!email) {
      throw new Error('Email required for JIT provisioning');
    }

    // Check if organization exists
    let org = await prisma.organization.findFirst({
      where: {
        ssoProvider: providerId,
        ssoId: userAttributes.department || 'default'
      }
    });

    if (!org) {
      // Create organization
      org = await prisma.organization.create({
        data: {
          name: userAttributes.department || 'Default Organization',
          ssoProvider: providerId,
          ssoId: userAttributes.department || 'default',
          plan: 'ENTERPRISE'
        }
      });
    }

    // Create or update user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          tier: 'ENTERPRISE',
          source: 'sso',
          emailVerified: true,
          organizationId: org.id,
          settings: {
            ssoProvider: providerId,
            ssoId: userAttributes['nameid'] || email,
            department: userAttributes.department,
            roles: userAttributes.roles || [],
            jitProvisioned: true
          }
        }
      });
    } else {
      // Update organization if needed
      if (!user.organizationId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            organizationId: org.id,
            settings: {
              ...user.settings as any,
              organization: org.name
            }
          }
        });
      }
    }

    return user;
  }

  // Role-based access control
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true
      }
    });

    if (!user || !user.organization) {
      return false;
    }

    // Check user roles
    const roles = (user.settings as any)?.roles || [];
    const userTier = user.tier;

    // Permission matrix
    const permissions = {
      'FREE': ['read:own', 'read:public'],
      'PRO': ['read:own', 'read:public', 'create:domains', 'create:inboxes'],
      'BUSINESS': [
        'read:own',
        'read:public',
        'create:domains',
        'create:inboxes',
        'create:users',
        'read:all'
      ],
      'ENTERPRISE': [
        '*'
      ]
    };

    // Check if user has required permission
    const requiredPermission = `${action}:${resource}`;
    const userPermissions = permissions[userTier] || [];

    // Super admins have all permissions
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return true;
    }

    // Check specific permissions
    return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
  }

  registerRoutes(app: FastifyInstance) {
    // Get SSO configuration
    app.get('/api/sso/config', async (request, reply) => {
      try {
        const config = this.getSSOConfig();
        reply.send(config);
      } catch (error) {
        reply.status(500).send({ error: 'Failed to get SSO configuration' });
      }
    });

    // Initiate SSO
    app.get('/api/sso/:providerId/initiate', async (request, reply) => {
      try {
        const { providerId } = request.params as any;
        const { redirectUrl } = request.query as any;

        const result = await this.initiateSSO(providerId, redirectUrl as string);

        reply.send(result);
      } catch (error) {
        reply.status(400).send({ error: error.message });
      }
    });

    // SAML Callback
    app.post('/api/sso/saml/:providerId/callback', async (request, reply) => {
      try {
        const { providerId } = request.params as any;
        const { SAMLResponse, RelayState } = request.body as any;

        const result = await this.handleSAMLCallback(
          providerId,
          SAMLResponse,
          RelayState
        );

        reply.send(result);
      } catch (error) {
        reply.status(400).send({ error: error.message });
      }
    });

    // OIDC Callback
    app.post('/api/sso/oidc/:providerId/callback', async (request, reply) => {
      try {
        const { providerId } = request.params as any;
        const { code, state } = request.body as any;

        const result = await this.handleOIDCCallback(providerId, code, state);

        reply.send(result);
      } catch (error) {
        reply.status(400).send({ error: error.message });
      }
    });

    // Get user permissions
    app.get('/api/sso/permissions/:resource/:action', {
      preHandler: [app.authenticate],
    }, async (request, reply) => {
      try {
        const { resource, action } = request.params as any;
        const user = (request as any).user;

        const hasPermission = await this.checkPermission(
          user.userId,
          resource,
          action
        );

        reply.send({ hasPermission });
      } catch (error) {
        reply.status(500).send({ error: error.message });
      }
    });
  }
}

export default SSOService;