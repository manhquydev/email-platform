import { FastifyRequest, FastifyReply } from 'fastify';
import { apiKeyService } from '../services/apiKeyService';
import { createHash } from 'crypto';

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Invalid authentication',
      message: 'API key required in Authorization header (Bearer <api-key>)'
    });
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const validation = await apiKeyService.validateApiKey(apiKey);

    if (!validation.valid) {
      return reply.status(401).send({
        error: 'Invalid API key',
        message: 'The provided API key is invalid, inactive, or expired'
      });
    }

    // Add authentication context to request
    request.apiKey = {
      id: validation.apiKeyId!,
      organizationId: validation.organizationId,
      permissions: validation.permissions || [],
      rateLimit: validation.rateLimit,
      burstLimit: validation.burstLimit,
      userId: validation.userId,
    };

    // Record API usage
    if (request.method && request.url) {
      // We'll record usage in a hook after response is sent
      (request as any).recordApiUsage = true;
    }
  } catch (error) {
    request.log.error(error, 'API key validation failed');
    return reply.status(500).send({
      error: 'Authentication failed',
      message: 'Unable to validate API key'
    });
  }
}

export function requireApiKeyPermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.apiKey) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'API key authentication required'
      });
    }

    const permissions = request.apiKey.permissions || [];

    if (!permissions.includes('admin') && !permissions.includes(permission)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: `API key requires '${permission}' permission`,
        requiredPermission: permission,
        currentPermissions: permissions
      });
    }
  };
}

// Hook to record API usage after response is sent
export async function recordApiUsageHook(request: FastifyRequest, reply: FastifyReply) {
  if ((request as any).recordApiUsage && request.apiKey && request.apiKey.id) {
    const startTime = Date.now();

    // Store start time for later use
    (request as any).startTime = startTime;
  }
}

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: {
      id: string;
      organizationId?: string;
      permissions: string[];
      rateLimit?: number;
      burstLimit?: number;
      userId?: string;
    };
  }
}