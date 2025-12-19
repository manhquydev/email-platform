import { PrismaClient, OrganizationRole } from '@prisma/client';
import { PermissionService } from '../services/permissionService';
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from '../middleware/rbac';

const prisma = new PrismaClient();

describe('RBAC System', () => {
  let testUser: any;
  let testOrg: any;
  let testDomain: any;
  let testInbox: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: 'USER',
      },
    });

    // Create test organization
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
        ownerId: testUser.id,
      },
    });

    // Add user as owner
    await prisma.organizationMember.create({
      data: {
        organizationId: testOrg.id,
        userId: testUser.id,
        role: OrganizationRole.OWNER,
        isActive: true,
      },
    });

    // Create test domain
    testDomain = await prisma.domain.create({
      data: {
        name: 'test.example.com',
        verificationToken: 'token',
        organizationId: testOrg.id,
      },
    });

    // Create test inbox
    testInbox = await prisma.inbox.create({
      data: {
        domainId: testDomain.id,
        localPart: 'test',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.message.deleteMany({ where: { inboxId: testInbox.id } });
    await prisma.inbox.delete({ where: { id: testInbox.id } });
    await prisma.domain.delete({ where: { id: testDomain.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('PermissionService', () => {
    it('should allow owner to manage organization', async () => {
      const canEdit = await PermissionService.checkOrganizationPermission(
        testUser.id,
        testOrg.id,
        'edit'
      );
      expect(canEdit).toBe(true);

      const canDelete = await PermissionService.checkOrganizationPermission(
        testUser.id,
        testOrg.id,
        'delete'
      );
      expect(canDelete).toBe(true);
    });

    it('should allow owner to manage domains', async () => {
      const canEdit = await PermissionService.canManageDomain(
        testUser.id,
        testDomain.id,
        'edit'
      );
      expect(canEdit).toBe(true);

      const canDelete = await PermissionService.canManageDomain(
        testUser.id,
        testDomain.id,
        'delete'
      );
      expect(canDelete).toBe(true);
    });

    it('should allow owner to manage inboxes', async () => {
      const canEdit = await PermissionService.canManageInbox(
        testUser.id,
        testInbox.id,
        'edit'
      );
      expect(canEdit).toBe(true);

      const canDelete = await PermissionService.canManageInbox(
        testUser.id,
        testInbox.id,
        'delete'
      );
      expect(canDelete).toBe(true);
    });
  });

  describe('Permission Middleware', () => {
    it('should check permissions correctly', async () => {
      const hasOrgView = await hasPermission(
        testUser.id,
        testOrg.id,
        Permission.ORG_VIEW
      );
      expect(hasOrgView).toBe(true);

      const hasOrgDelete = await hasPermission(
        testUser.id,
        testOrg.id,
        Permission.ORG_DELETE
      );
      expect(hasOrgDelete).toBe(true);

      const hasAnyPerm = await hasAnyPermission(
        testUser.id,
        testOrg.id,
        [Permission.ORG_VIEW, Permission.DOMAIN_CREATE]
      );
      expect(hasAnyPerm).toBe(true);

      const hasAllPerms = await hasAllPermissions(
        testUser.id,
        testOrg.id,
        [Permission.ORG_VIEW, Permission.ORG_EDIT]
      );
      expect(hasAllPerms).toBe(true);
    });
  });

  describe('Role-based Access', () => {
    it('should respect role hierarchy', async () => {
      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: 'hashed',
          role: 'USER',
        },
      });

      // Add admin user as admin
      await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: adminUser.id,
          role: OrganizationRole.ADMIN,
          isActive: true,
        },
      });

      // Admin should be able to edit but not delete
      const canEdit = await PermissionService.checkOrganizationPermission(
        adminUser.id,
        testOrg.id,
        'edit'
      );
      expect(canEdit).toBe(true);

      const canDelete = await PermissionService.checkOrganizationPermission(
        adminUser.id,
        testOrg.id,
        'delete'
      );
      expect(canDelete).toBe(false);

      // Cleanup
      await prisma.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: testOrg.id,
            userId: adminUser.id,
          },
        },
      });
      await prisma.user.delete({ where: { id: adminUser.id } });
    });

    it('should handle viewer role correctly', async () => {
      // Create viewer user
      const viewerUser = await prisma.user.create({
        data: {
          email: 'viewer@example.com',
          passwordHash: 'hashed',
          role: 'USER',
        },
      });

      // Add viewer user as viewer
      await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: viewerUser.id,
          role: OrganizationRole.VIEWER,
          isActive: true,
        },
      });

      // Viewer should only be able to view
      const canView = await PermissionService.checkOrganizationPermission(
        viewerUser.id,
        testOrg.id,
        'view'
      );
      expect(canView).toBe(true);

      const canEdit = await PermissionService.checkOrganizationPermission(
        viewerUser.id,
        testOrg.id,
        'edit'
      );
      expect(canEdit).toBe(false);

      // Cleanup
      await prisma.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: testOrg.id,
            userId: viewerUser.id,
          },
        },
      });
      await prisma.user.delete({ where: { id: viewerUser.id } });
    });
  });

  describe('Custom Permissions', () => {
    it('should respect custom permissions override', async () => {
      // Create member user
      const memberUser = await prisma.user.create({
        data: {
          email: 'member@example.com',
          passwordHash: 'hashed',
          role: 'USER',
        },
      });

      // Add member with custom permission to delete domains
      await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: memberUser.id,
          role: OrganizationRole.MEMBER,
          permissions: [Permission.DOMAIN_DELETE],
          isActive: true,
        },
      });

      // Member should be able to delete due to custom permission
      const canDelete = await PermissionService.canManageDomain(
        memberUser.id,
        testDomain.id,
        'delete'
      );
      expect(canDelete).toBe(true);

      // Cleanup
      await prisma.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: testOrg.id,
            userId: memberUser.id,
          },
        },
      });
      await prisma.user.delete({ where: { id: memberUser.id } });
    });
  });
});