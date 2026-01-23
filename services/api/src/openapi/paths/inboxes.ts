/**
 * OpenAPI Path Definitions - Inbox Routes
 */

import { registry, InboxSchema, CreateInboxRequestSchema, ErrorResponseSchema, PaginationMetaSchema } from '../registry';
import { z } from 'zod';

// GET /inboxes
const ListInboxesResponseSchema = z.object({
  data: z.array(InboxSchema),
  meta: PaginationMetaSchema,
});

registry.registerPath({
  method: 'get',
  path: '/inboxes',
  tags: ['Inboxes'],
  summary: 'List all inboxes',
  description: 'Retrieve all inboxes for the authenticated user with pagination.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(20),
      domain: z.string().optional(),
      personal: z.coerce.boolean().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of inboxes',
      content: {
        'application/json': {
          schema: ListInboxesResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /inboxes
registry.registerPath({
  method: 'post',
  path: '/inboxes',
  tags: ['Inboxes'],
  summary: 'Create a new inbox',
  description: 'Create a temporary email inbox. If no localPart is provided, a random one will be generated.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateInboxRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Inbox created',
      content: {
        'application/json': {
          schema: InboxSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /inboxes/:id
registry.registerPath({
  method: 'get',
  path: '/inboxes/{id}',
  tags: ['Inboxes'],
  summary: 'Get inbox by ID',
  description: 'Retrieve a specific inbox by its ID.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Inbox details',
      content: {
        'application/json': {
          schema: InboxSchema,
        },
      },
    },
    404: {
      description: 'Inbox not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /inboxes/:id
registry.registerPath({
  method: 'delete',
  path: '/inboxes/{id}',
  tags: ['Inboxes'],
  summary: 'Delete an inbox',
  description: 'Delete an inbox and all its messages.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Inbox deleted',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: {
      description: 'Inbox not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /inboxes/bulk
const BulkCreateInboxesRequestSchema = z.object({
  count: z.number().min(1).max(10),
  domainId: z.string().uuid().optional(),
});

const BulkCreateInboxesResponseSchema = z.object({
  created: z.array(InboxSchema),
  failed: z.array(z.object({ error: z.string() })),
});

registry.registerPath({
  method: 'post',
  path: '/inboxes/bulk',
  tags: ['Inboxes'],
  summary: 'Bulk create inboxes',
  description: 'Create multiple inboxes at once. Maximum 10 per request.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: BulkCreateInboxesRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Inboxes created',
      content: {
        'application/json': {
          schema: BulkCreateInboxesResponseSchema,
        },
      },
    },
  },
});
