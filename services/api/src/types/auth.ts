import { FastifyRequest } from 'fastify';
import { OrganizationMember } from '@prisma/client';

// Export type for use in routes
export interface UserInfo {
  userId: string;
  email: string;
  role: string;
  id: string;
}

// Extend FastifyRequest type to include user and organization info
declare module 'fastify' {
  interface FastifyRequest {
    user?: UserInfo;
    organizationMember?: OrganizationMember;
  }
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: NonNullable<FastifyRequest['user']>;
  organizationMember?: OrganizationMember;
}