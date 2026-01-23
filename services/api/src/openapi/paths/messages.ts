/**
 * OpenAPI Path Definitions - Message Routes
 */

import { registry, MessageSchema, ErrorResponseSchema, PaginationMetaSchema } from '../registry';
import { z } from 'zod';

// GET /messages
const ListMessagesResponseSchema = z.object({
  data: z.array(MessageSchema),
  meta: PaginationMetaSchema,
});

registry.registerPath({
  method: 'get',
  path: '/messages',
  tags: ['Messages'],
  summary: 'List messages',
  description: 'List messages with optional filtering by inbox, search query, and read status.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    query: z.object({
      inboxId: z.string().uuid().optional(),
      q: z.string().optional().describe('Search in subject and body'),
      from: z.string().optional().describe('Filter by sender'),
      isRead: z.coerce.boolean().optional(),
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(20),
    }),
  },
  responses: {
    200: {
      description: 'List of messages',
      content: {
        'application/json': {
          schema: ListMessagesResponseSchema,
        },
      },
    },
  },
});

// GET /messages/:id
registry.registerPath({
  method: 'get',
  path: '/messages/{id}',
  tags: ['Messages'],
  summary: 'Get message by ID',
  description: 'Retrieve a specific message with full content and attachments.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Message details',
      content: {
        'application/json': {
          schema: MessageSchema,
        },
      },
    },
    404: {
      description: 'Message not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// DELETE /messages/:id
registry.registerPath({
  method: 'delete',
  path: '/messages/{id}',
  tags: ['Messages'],
  summary: 'Delete a message',
  description: 'Delete a message and its attachments.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Message deleted',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    404: {
      description: 'Message not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// PATCH /messages/:id/read
registry.registerPath({
  method: 'patch',
  path: '/messages/{id}/read',
  tags: ['Messages'],
  summary: 'Mark message as read/unread',
  description: 'Update the read status of a message.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            isRead: z.boolean(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Status updated',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  },
});

// GET /messages/search
registry.registerPath({
  method: 'get',
  path: '/messages/search',
  tags: ['Messages'],
  summary: 'Search messages',
  description: 'Full-text search across all messages in user inboxes.',
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  request: {
    query: z.object({
      q: z.string().min(1).describe('Search query'),
      limit: z.coerce.number().optional().default(50),
    }),
  },
  responses: {
    200: {
      description: 'Search results',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(MessageSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
});
