import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../setup';
import { prismaWithTenant } from '../../lib/prisma';
import { OrganizationRole, UserRole } from '@prisma/client';

describe('Phase01: Multi-tenancy', () => {
  // Cleanup organizations created during tests
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await prisma.organizationMember.deleteMany({
        where: { organizationId: { in: createdOrgIds } }
      });
      await prisma.organization.deleteMany({
        where: { id: { in: createdOrgIds } }
      });
    }
  });

  describe('Organization Management', () => {
    it('should create an organization successfully', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Acme Corp',
          slug: 'acme-corp-' + Date.now(),
          settings: { theme: 'dark' }
        }
      });
      createdOrgIds.push(org.id);

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Acme Corp');
      expect((org.settings as any).theme).toBe('dark');
    });

    it('should enforce unique slugs', async () => {
      const slug = 'unique-slug-' + Date.now();
      const org1 = await prisma.organization.create({
        data: { name: 'Org 1', slug }
      });
      createdOrgIds.push(org1.id);

      await expect(prisma.organization.create({
        data: { name: 'Org 2', slug }
      })).rejects.toThrow();
    });
  });

  describe('Organization Members', () => {
    it('should add a user to an organization with a role', async () => {
      const org = await prisma.organization.create({
        data: { name: 'Member Test Org', slug: 'member-test-' + Date.now() }
      });
      createdOrgIds.push(org.id);

      const user = await prisma.user.create({
        data: {
          email: `user-${Date.now()}@example.com`,
          passwordHash: 'hashed',
          name: 'Test User'
        }
      });

      const member = await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: OrganizationRole.ADMIN
        }
      });

      expect(member.organizationId).toBe(org.id);
      expect(member.userId).toBe(user.id);
      expect(member.role).toBe(OrganizationRole.ADMIN);
    });
  });

  describe('Tenant Isolation (Prisma Extension)', () => {
    it('should isolate data between tenants', async () => {
      // Create Tenant A
      const orgA = await prisma.organization.create({
        data: { name: 'Tenant A', slug: 'tenant-a-' + Date.now() }
      });
      createdOrgIds.push(orgA.id);

      // Create Tenant B
      const orgB = await prisma.organization.create({
        data: { name: 'Tenant B', slug: 'tenant-b-' + Date.now() }
      });
      createdOrgIds.push(orgB.id);

      // Create Domain for Tenant A
      await prisma.domain.create({
        data: {
          name: 'tenant-a.com',
          status: 'VERIFIED',
          verificationToken: 'token-a',
          organizationId: orgA.id
        }
      });

      // Create Domain for Tenant B
      await prisma.domain.create({
        data: {
          name: 'tenant-b.com',
          status: 'VERIFIED',
          verificationToken: 'token-b',
          organizationId: orgB.id
        }
      });

      // Query using tenant-scoped client for Tenant A
      const tenantAClient = prismaWithTenant(orgA.id);
      const domainsA = await tenantAClient.domain.findMany({});

      expect(domainsA).toHaveLength(1);
      expect(domainsA[0].name).toBe('tenant-a.com');

      // Query using tenant-scoped client for Tenant B
      const tenantBClient = prismaWithTenant(orgB.id);
      const domainsB = await tenantBClient.domain.findMany({});

      expect(domainsB).toHaveLength(1);
      expect(domainsB[0].name).toBe('tenant-b.com');
    });

    it('should not return unassigned resources when tenant is specified', async () => {
      const org = await prisma.organization.create({
        data: { name: 'Isolation Test', slug: 'iso-test-' + Date.now() }
      });
      createdOrgIds.push(org.id);

      // Create a public/unassigned domain
      await prisma.domain.create({
        data: {
          name: 'public-domain.com',
          status: 'VERIFIED',
          verificationToken: 'token-public'
        }
      });

      const tenantClient = prismaWithTenant(org.id);
      const domains = await tenantClient.domain.findMany({});

      // Should return 0 because the query extension filters by organizationId = tenantId
      expect(domains).toHaveLength(0);
    });
  });
});
