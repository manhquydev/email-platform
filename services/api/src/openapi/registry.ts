/**
 * OpenAPI Registry - Central registry for all API schemas and paths
 * Uses zod-to-openapi for automatic schema generation
 */

import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI support - MUST be called before using .openapi()
extendZodWithOpenApi(z);

// Initialize the registry
export const registry = new OpenAPIRegistry();

// ============== Common Schemas ==============

// Pagination response schema
export const PaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

registry.register('PaginationMeta', PaginationMetaSchema);

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

registry.register('ErrorResponse', ErrorResponseSchema);

// ============== Auth Schemas ==============

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(['USER', 'ADMIN']),
    tier: z.string(),
  }),
  requires2FA: z.boolean().optional(),
  tempToken: z.string().optional(),
});

registry.register('LoginRequest', LoginRequestSchema);
registry.register('LoginResponse', LoginResponseSchema);

// ============== Domain Schemas ==============

export const DomainSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isVerified: z.boolean(),
  isPublic: z.boolean(),
  verificationToken: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateDomainRequestSchema = z.object({
  name: z.string().min(1),
});

registry.register('Domain', DomainSchema);
registry.register('CreateDomainRequest', CreateDomainRequestSchema);

// ============== Inbox Schemas ==============

export const InboxSchema = z.object({
  id: z.string().uuid(),
  localPart: z.string(),
  address: z.string().email(),
  domainId: z.string().uuid(),
  ownerId: z.string().uuid().nullable(),
  expiresAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateInboxRequestSchema = z.object({
  localPart: z.string().optional(),
  domainId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

registry.register('Inbox', InboxSchema);
registry.register('CreateInboxRequest', CreateInboxRequestSchema);

// ============== Message Schemas ==============

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  inboxId: z.string().uuid(),
  fromAddress: z.string().nullable(),
  toAddress: z.string().nullable(),
  subject: z.string().nullable(),
  textBody: z.string().nullable(),
  htmlBody: z.string().nullable(),
  isRead: z.boolean(),
  receivedAt: z.string().datetime(),
  attachments: z.array(AttachmentSchema).optional(),
});

registry.register('Attachment', AttachmentSchema);
registry.register('Message', MessageSchema);

// ============== Webhook Schemas ==============

export const WebhookSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  secret: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateWebhookRequestSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).default(['email.received']),
});

registry.register('Webhook', WebhookSchema);
registry.register('CreateWebhookRequest', CreateWebhookRequestSchema);

// ============== API Key Schemas ==============

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(50),
  expiresAt: z.string().datetime().optional(),
});

export const CreateApiKeyResponseSchema = ApiKeySchema.extend({
  key: z.string().describe('Full API key - only shown once'),
});

registry.register('ApiKey', ApiKeySchema);
registry.register('CreateApiKeyRequest', CreateApiKeyRequestSchema);
registry.register('CreateApiKeyResponse', CreateApiKeyResponseSchema);

// ============== Security Schemes ==============

registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token authentication',
});

registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-KEY',
  description: 'API key authentication',
});

// ============== Generator Function ==============

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Ephemera API',
      version: '1.0.0',
      description: 'Temporary email platform API for developers. Create disposable inboxes, receive emails, extract OTP codes, and integrate with webhooks.',
      contact: {
        name: 'Ephemera Support',
        url: 'https://manhquy.click',
        email: 'support@manhquy.click',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.manhquy.click/v1',
        description: 'Production',
      },
      {
        url: 'http://localhost:3001/v1',
        description: 'Development',
      },
    ],
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Domains', description: 'Domain management' },
      { name: 'Inboxes', description: 'Inbox operations' },
      { name: 'Messages', description: 'Email message operations' },
      { name: 'Webhooks', description: 'Webhook configuration' },
      { name: 'API Keys', description: 'API key management' },
    ],
  });
}
