import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth';
import { ApiKeyStatus } from '@prisma/client';
import { apiKeyService } from '../services/apiKeyService';
import { PermissionService } from '../services/permissionService';
import { recordAudit } from '../utils/audit';
import { checkQuota } from '../middleware/quota';

export async function apiKeyRoutes(app: FastifyInstance) {
  // Create new API key
  app.post('/api-keys', {
    preHandler: [app.authenticate, checkQuota('api_key')]
  }, async (request: AuthenticatedRequest, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1).max(255),
      organizationId: z.string().uuid().optional(),
      permissions: z.array(z.string()).default(['read']),
      description: z.string().max(500).optional(),
      rateLimit: z.number().min(1).max(10000).optional(),
      burstLimit: z.number().min(1).max(100).optional(),
      expiresAt: z.string().datetime().optional(),
    });

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const result = await apiKeyService.createApiKey(userId, {
        name: body.data.name,
        organizationId: body.data.organizationId,
        permissions: body.data.permissions,
        description: body.data.description,
        rateLimit: body.data.rateLimit,
        burstLimit: body.data.burstLimit,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
      });

      return {
        success: true,
        apiKey: result.apiKey, // Full key only shown once
        key: result.response, // API key details without the actual key
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to create API key');
      return reply.status(500).send({ error: 'Failed to create API key' });
    }
  });

  // Get API keys (personal or organization)
  app.get('/api-keys', { preHandler: app.authenticate }, async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'REVOKED']).optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const apiKeys = await apiKeyService.getApiKeys(
        userId,
        query.data.organizationId,
        query.data.status as ApiKeyStatus
      );

      return {
        data: apiKeys.slice(query.data.offset, query.data.offset + query.data.limit),
        meta: {
          total: apiKeys.length,
          limit: query.data.limit,
          offset: query.data.offset,
        },
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch API keys');
      return reply.status(500).send({ error: 'Failed to fetch API keys' });
    }
  });

  // Get specific API key
  app.get('/api-keys/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    const userId = (request.user as any).userId;

    try {
      const apiKey = await apiKeyService.getApiKeyById(userId, params.data.id);
      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }
      return { data: apiKey };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch API key');
      return reply.status(500).send({ error: 'Failed to fetch API key' });
    }
  });

  // Update API key
  app.patch('/api-keys/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    const bodySchema = z.object({
      name: z.string().min(1).max(255).optional(),
      permissions: z.array(z.string()).optional(),
      description: z.string().max(500).optional(),
      rateLimit: z.number().min(1).max(10000).optional(),
      burstLimit: z.number().min(1).max(100).optional(),
      expiresAt: z.string().datetime().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'REVOKED']).optional(),
    });

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: body.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const apiKey = await apiKeyService.updateApiKey(userId, params.data.id, {
        ...body.data,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
        status: body.data.status as ApiKeyStatus,
      });

      return { success: true, data: apiKey };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'API key not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to update API key');
      return reply.status(500).send({ error: 'Failed to update API key' });
    }
  });

  // Revoke API key
  app.post('/api-keys/:id/revoke', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    const userId = (request.user as any).userId;

    try {
      await apiKeyService.revokeApiKey(userId, params.data.id);
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'API key not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to revoke API key');
      return reply.status(500).send({ error: 'Failed to revoke API key' });
    }
  });

  // Delete API key permanently
  app.delete('/api-keys/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    const userId = (request.user as any).userId;

    try {
      await apiKeyService.deleteApiKey(userId, params.data.id);
      return { success: true };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'API key not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to delete API key');
      return reply.status(500).send({ error: 'Failed to delete API key' });
    }
  });

  // Get API key usage statistics
  app.get('/api-keys/:id/usage', { preHandler: app.authenticate }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({
      days: z.coerce.number().min(1).max(365).default(30),
    });

    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.flatten() });
    }

    const userId = (request.user as any).userId;

    try {
      const usage = await apiKeyService.getApiKeyUsage(userId, params.data.id, query.data.days);
      return { data: usage };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      if (error.message === 'API key not found') {
        return reply.status(404).send({ error: error.message });
      }
      app.log.error(error, 'Failed to fetch API key usage');
      return reply.status(500).send({ error: 'Failed to fetch API key usage' });
    }
  });

  // Regenerate API key (revoke old, create new)
  app.post('/api-keys/:id/regenerate', {
    preHandler: app.authenticate
  }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      confirm: z.boolean(),
    });

    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid API key ID' });
    }

    if (!body.success || !body.data.confirm) {
      return reply.status(400).send({
        error: 'Confirmation required',
        message: 'Set confirm: true to regenerate API key'
      });
    }

    const userId = (request.user as any).userId;

    try {
      // First, get the existing API key
      const existingKey = await apiKeyService.getApiKeyById(userId, params.data.id);
      if (!existingKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      // Create new API key with same settings
      const newResult = await apiKeyService.createApiKey(userId, {
        name: existingKey.name,
        organizationId: existingKey.organizationId,
        permissions: existingKey.permissions,
        description: existingKey.description,
        rateLimit: existingKey.rateLimit,
        burstLimit: existingKey.burstLimit,
        expiresAt: existingKey.expiresAt,
      });

      // Revoke the old key
      await apiKeyService.revokeApiKey(userId, params.data.id);

      await recordAudit(userId, 'API_KEY_REGENERATED', {
        oldKeyId: params.data.id,
        newKeyId: newResult.response.id,
        name: existingKey.name,
        organizationId: existingKey.organizationId,
      });

      return {
        success: true,
        apiKey: newResult.apiKey, // New key
        key: newResult.response, // New key details
      };
    } catch (error: any) {
      if (error.message.includes('Not authorized')) {
        return reply.status(403).send({ error: error.message });
      }
      app.log.error(error, 'Failed to regenerate API key');
      return reply.status(500).send({ error: 'Failed to regenerate API key' });
    }
  });
}