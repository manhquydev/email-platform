/**
 * OpenAPI Path Definitions - Auth Routes
 */

import { registry, LoginRequestSchema, LoginResponseSchema, ErrorResponseSchema } from '../registry';
import { z } from 'zod';

// POST /auth/login
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Login with email and password',
  description: 'Authenticate user and receive JWT token. If 2FA is enabled, returns tempToken for verification.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /auth/register
const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
  message: z.string(),
});

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'Register new account',
  description: 'Create a new user account. Email verification may be required.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: RegisterResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error or email already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// POST /auth/2fa/verify
const Verify2FARequestSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6),
});

registry.registerPath({
  method: 'post',
  path: '/auth/2fa/verify',
  tags: ['Auth'],
  summary: 'Verify 2FA code',
  description: 'Complete login by verifying TOTP code when 2FA is enabled.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: Verify2FARequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: '2FA verification successful',
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid code or token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// GET /auth/me
const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  tier: z.string(),
  has2FA: z.boolean(),
  createdAt: z.string().datetime(),
});

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Get current user profile',
  description: 'Retrieve the authenticated user profile.',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'User profile',
      content: {
        'application/json': {
          schema: UserProfileSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});
