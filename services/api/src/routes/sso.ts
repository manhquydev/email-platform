import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth';
import { ssoService } from '../services/ssoService';
import { recordAudit } from '../utils/audit';
import { PermissionService } from '../services/permissionService';
import { prisma } from '../lib/prisma';

export async function ssoRoutes(app: FastifyInstance) {
  // Get SSO configuration for organization
  app.get('/sso/:organizationId/config', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const isAdmin = await PermissionService.isSystemAdmin(userId);

    if (!isAdmin) {
      const isMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: params.data.organizationId,
            userId: userId
          }
        }
      });

      if (!isMember || !['OWNER', 'ADMIN'].includes(isMember.role)) {
        return reply.status(403).send({ error: 'Not authorized to view SSO configuration' });
      }
    }

    const config = await ssoService.getSsoConfig(params.data.organizationId);
    if (!config) {
      return reply.status(404).send({ error: 'SSO not configured for this organization' });
    }

    // Return config without sensitive data
    const { clientSecret, ...safeConfig } = config;
    return { config: safeConfig };
  });

  // Configure SSO for organization
  app.post('/sso/:organizationId/configure', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const bodySchema = z.object({
      provider: z.enum(['SAML', 'OIDC']),
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      redirectUri: z.string().url(),
      metadataUrl: z.string().url().optional(),
      authorizationUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
      userInfoUrl: z.string().url().optional(),
      issuer: z.string().optional(),
      domain: z.string().optional(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid configuration', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to configure SSO' });
    }

    try {
      const config = await ssoService.configureSso(
        params.data.organizationId,
        body.data.provider,
        body.data
      );

      await recordAudit(userId, 'SSO_CONFIGURED', {
        organizationId: params.data.organizationId,
        provider: body.data.provider,
        clientId: body.data.clientId,
      });

      return { success: true, config: { provider: config.provider, clientId: config.clientId } };
    } catch (error) {
      app.log.error(error, 'Failed to configure SSO');
      return reply.status(500).send({ error: 'Failed to configure SSO' });
    }
  });

  // Get SSO authorization URL
  app.get('/sso/:organizationId/auth', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    const query = z.object({ state: z.string().optional() }).safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    try {
      const authUrl = await ssoService.getAuthorizationUrl(
        params.data.organizationId,
        query.data.state
      );

      return { authUrl };
    } catch (error: any) {
      if (error.message === 'SSO not configured for organization') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to generate SSO auth URL');
      return reply.status(500).send({ error: 'Failed to generate authorization URL' });
    }
  });

  // Handle SSO callback
  app.post('/sso/:organizationId/callback', async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      code: z.string().min(1),
      state: z.string().optional(),
    }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    try {
      const tokens = await ssoService.exchangeCodeForTokens(
        params.data.organizationId,
        body.data.code,
        body.data.state
      );

      // Sync user with local database
      const { user, isNew } = await ssoService.syncSsoUser(
        params.data.organizationId,
        tokens.user,
        tokens.accessToken,
        tokens.refreshToken
      );

      // Generate JWT token for the user
      const { generateToken } = await import('../utils/token');
      const jwtToken = generateToken({ userId: user.id });

      await recordAudit(user.id, 'SSO_LOGIN', {
        organizationId: params.data.organizationId,
        email: tokens.user.email,
        isNewUser: isNew,
      });

      return {
        success: true,
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          organizationId: params.data.organizationId,
        },
      };
    } catch (error: any) {
      app.log.error(error, 'SSO callback failed');
      return reply.status(400).send({ error: 'SSO authentication failed' });
    }
  });

  // Disable SSO for organization
  app.delete('/sso/:organizationId/disable', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to disable SSO' });
    }

    await ssoService.disableSso(params.data.organizationId);

    await recordAudit(userId, 'SSO_DISABLED', {
      organizationId: params.data.organizationId,
    });

    return { success: true };
  });

  // Test SSO configuration
  app.post('/sso/:organizationId/test', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid organization ID' });
    }

    const userId = (request.user as any).userId;
    const canManage = await PermissionService.checkOrganizationPermission(
      userId,
      params.data.organizationId,
      'manage'
    );

    if (!canManage) {
      return reply.status(403).send({ error: 'Not authorized to test SSO configuration' });
    }

    const result = await ssoService.testSsoConfiguration(params.data.organizationId);

    await recordAudit(userId, 'SSO_CONFIGURATION_TESTED', {
      organizationId: params.data.organizationId,
      valid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  });

  // Get SSO metadata for providers
  app.get('/sso/metadata/:provider', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ provider: z.enum(['SAML', 'OIDC']) }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    try {
      const metadata = await ssoService.getSsoMetadata(params.data.provider);
      if (!metadata) {
        return reply.status(404).send({ error: 'Provider not found' });
      }
      return metadata;
    } catch (error) {
      app.log.error(error, 'Failed to fetch SSO metadata');
      return reply.status(500).send({ error: 'Failed to fetch SSO metadata' });
    }
  });

  // Validate SSO session
  app.post('/sso/:organizationId/validate', { preHandler: app.authenticate }, async (request, reply) => {
    const params = z.object({ organizationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ token: z.string().min(1) }).safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    try {
      const isValid = await ssoService.validateSsoSession(
        params.data.organizationId,
        body.data.token
      );

      return { valid: isValid };
    } catch (error) {
      app.log.error(error, 'Failed to validate SSO session');
      return reply.status(500).send({ error: 'Failed to validate session' });
    }
  });
}