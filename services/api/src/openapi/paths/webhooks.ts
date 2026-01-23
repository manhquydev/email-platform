/**
 * OpenAPI Path Definitions - Webhook Routes
 */

import { registry, WebhookSchema, CreateWebhookRequestSchema, ErrorResponseSchema } from '../registry';
import { z } from 'zod';

// GET /webhooks
registry.registerPath({
  method: 'get',
  path: '/webhooks',
  tags: ['Webhooks'],
  summary: 'List all webhooks',
  description: 'Retrieve all webhooks configured for the authenticated user.',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'List of webhooks',
      content: {
        'application/json': {
          schema: z.array(WebhookSchema),
        },
      },
    },
  },
});

// POST /webhooks
registry.registerPath({
  method: 'post',
  path: '/webhooks',
  tags: ['Webhooks'],
  summary: 'Create a webhook',
  description: 'Create a new webhook endpoint. A secret will be generated for signature verification.',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateWebhookRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Webhook created',
      content: {
        'application/json': {
          schema: WebhookSchema,
        },
      },
    },
    400: {
      description: 'Validation error or SSRF blocked',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /webhooks/:id
registry.registerPath({
  method: 'delete',
  path: '/webhooks/{id}',
  tags: ['Webhooks'],
  summary: 'Delete a webhook',
  description: 'Delete a webhook configuration.',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Webhook deleted',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: {
      description: 'Webhook not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PUT /webhooks/:id
const UpdateWebhookRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

registry.registerPath({
  method: 'put',
  path: '/webhooks/{id}',
  tags: ['Webhooks'],
  summary: 'Update a webhook',
  description: 'Update webhook configuration.',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateWebhookRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook updated',
      content: {
        'application/json': {
          schema: WebhookSchema,
        },
      },
    },
  },
});

// POST /webhooks/:id/test
registry.registerPath({
  method: 'post',
  path: '/webhooks/{id}/test',
  tags: ['Webhooks'],
  summary: 'Test a webhook',
  description: 'Send a test payload to the webhook endpoint.',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Test queued',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

// GET /webhooks/events
registry.registerPath({
  method: 'get',
  path: '/webhooks/events',
  tags: ['Webhooks'],
  summary: 'List available webhook events',
  description: 'Get all available webhook event types that can be subscribed to.',
  responses: {
    200: {
      description: 'Available events',
      content: {
        'application/json': {
          schema: z.object({
            events: z.array(z.object({
              event: z.string(),
              description: z.string(),
              default: z.boolean(),
            })),
          }),
        },
      },
    },
  },
});

// POST /webhooks/verify-signature
registry.registerPath({
  method: 'post',
  path: '/webhooks/verify-signature',
  tags: ['Webhooks'],
  summary: 'Verify webhook signature',
  description: 'Utility endpoint to verify a webhook signature. Useful for debugging.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            payload: z.string(),
            signature: z.string(),
            secret: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Verification result',
      content: {
        'application/json': {
          schema: z.object({
            valid: z.boolean(),
          }),
        },
      },
    },
  },
});
