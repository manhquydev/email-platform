/**
 * Provider Authentication Middleware
 * Authenticates hosting providers via X-Provider-Key header
 * API keys are SHA-256 hashed for secure storage
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export interface ProviderAuthPayload {
  providerId: string;
  tier: string;
  status: string;
  limits: {
    maxTenants: number;
    maxMailboxes: number;
    maxStorageGb: number;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    provider?: ProviderAuthPayload;
  }
}

/**
 * Middleware to authenticate hosting provider API requests
 * Expects X-Provider-Key header with valid API key
 */
export async function providerAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-provider-key'] as string;

  if (!apiKey) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Provider API key required in X-Provider-Key header'
    });
    return;
  }

  // Validate key format (eph_provider_<64 hex chars>)
  if (!apiKey.startsWith('eph_provider_') || apiKey.length !== 77) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key format'
    });
    return;
  }

  // Hash the key for lookup
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  try {
    const provider = await prisma.hostingProvider.findUnique({
      where: { apiKeyHash: keyHash },
      select: {
        id: true,
        tier: true,
        status: true,
        maxTenants: true,
        maxMailboxes: true,
        maxStorageGb: true,
      },
    });

    if (!provider) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
      return;
    }

    if (provider.status !== 'ACTIVE') {
      reply.status(403).send({
        error: 'Forbidden',
        message: `Provider account is ${provider.status.toLowerCase()}`
      });
      return;
    }

    // Attach provider info to request
    request.provider = {
      providerId: provider.id,
      tier: provider.tier,
      status: provider.status,
      limits: {
        maxTenants: provider.maxTenants,
        maxMailboxes: provider.maxMailboxes,
        maxStorageGb: provider.maxStorageGb,
      },
    };
  } catch (error) {
    request.log.error(error, 'Provider auth error');
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Helper to generate a new provider API key
 * Returns the raw key (to be shown once) and hash (to be stored)
 */
export function generateProviderApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `eph_provider_${randomBytes}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 20);
  return { key, hash, prefix };
}
