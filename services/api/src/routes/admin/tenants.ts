import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AdminRole, requireAdminRole } from '../../middleware/rbac';
import { QuotaService } from '../../services/quota-service';

const prisma = new PrismaClient();

export default async function adminTenantsRoutes(fastify: FastifyInstance) {
  // List all organizations
  fastify.get('/', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.HELPDESK])
  }, async (req, reply) => {
    const { page = 1, limit = 20, search } = req.query as any;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [total, orgs] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { users: true, domains: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, pages: Math.ceil(total / limit), data: orgs };
  });

  // Get details
  fastify.get('/:id', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.HELPDESK])
  }, async (req, reply) => {
    const { id } = req.params as any;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        domains: true,
        identityProviders: true
      }
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return org;
  });

  // Update quota
  fastify.patch('/:id/quota', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN])
  }, async (req, reply) => {
    const { id } = req.params as any;
    const { storageQuotaGB } = req.body as any;

    const bytes = BigInt(storageQuotaGB) * BigInt(1024 * 1024 * 1024);

    const org = await prisma.organization.update({
      where: { id },
      data: { storageQuota: bytes }
    });

    return org;
  });

  // Suspend/Unsuspend (Stored in settings json for now as we didn't add a status column)
  fastify.post('/:id/suspend', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_OFFICER])
  }, async (req, reply) => {
    const { id } = req.params as any;
    const { reason } = req.body as any;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.status(404).send({ error: 'Not found' });

    const settings = (org.settings as any) || {};

    await prisma.organization.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          suspended: true,
          suspendReason: reason,
          suspendedAt: new Date().toISOString()
        }
      }
    });

    return { success: true };
  });

  fastify.post('/:id/unsuspend', {
    preHandler: requireAdminRole([AdminRole.SUPER_ADMIN])
  }, async (req, reply) => {
    const { id } = req.params as any;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return reply.status(404).send({ error: 'Not found' });

    const settings = (org.settings as any) || {};
    delete settings.suspended;
    delete settings.suspendReason;
    delete settings.suspendedAt;

    await prisma.organization.update({
      where: { id },
      data: { settings }
    });

    return { success: true };
  });
}
