import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";

declare module "fastify" {
  interface FastifyRequest {
    tenant?: {
      id: string;
      slug: string;
      settings: any;
    };
  }
}

export const tenantContext = async (request: FastifyRequest, reply: FastifyReply) => {
  // 1. Try to get tenant from authenticated user
  const user = (request as any).user;
  if (user && user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });

    if (org) {
      request.tenant = {
        id: org.id,
        slug: org.slug,
        settings: org.settings
      };
      return;
    }
  }

  // 2. A client-supplied X-Tenant-ID / X-Tenant-Slug header may only override the tenant
  // for an authenticated platform super-admin. An unauthenticated or ordinary user can
  // never select another organization by sending a header (prevents tenant impersonation).
  const isSuperAdmin = !!user && (user.adminRole === 'SUPER_ADMIN' || user.role === 'ADMIN');
  if (isSuperAdmin) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const tenantSlug = request.headers['x-tenant-slug'] as string;

    if (tenantId) {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId }
      });
      if (org) {
        request.tenant = {
          id: org.id,
          slug: org.slug,
          settings: org.settings
        };
        return;
      }
    }

    if (tenantSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: tenantSlug }
      });
      if (org) {
        request.tenant = {
          id: org.id,
          slug: org.slug,
          settings: org.settings
        };
        return;
      }
    }
  }

  // 3. Optional: Try to resolve from hostname (for custom domains)
  // This would require a reverse lookup on Domain model
  const host = request.hostname;
  if (host) {
    const domain = await prisma.domain.findUnique({
      where: { name: host },
      include: { organization: true }
    });

    if (domain?.organization) {
      request.tenant = {
        id: domain.organization.id,
        slug: domain.organization.slug,
        settings: domain.organization.settings
      };
    }
  }
};
