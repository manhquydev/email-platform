import { PrismaClient, OrganizationRole } from '@prisma/client';
import { Permission } from '../middleware/rbac';

const prisma = new PrismaClient();

/**
 * Script to set up initial RBAC permissions and roles
 */
async function setupRBAC() {
  console.log('Setting up RBAC system...');

  try {
    // Create default permission sets for each role
    const rolePermissions = {
      [OrganizationRole.OWNER]: [
        Permission.ORG_VIEW,
        Permission.ORG_EDIT,
        Permission.ORG_DELETE,
        Permission.ORG_INVITE,
        Permission.ORG_MANAGE_MEMBERS,
        Permission.ORG_VIEW_SETTINGS,
        Permission.ORG_EDIT_SETTINGS,
        Permission.ORG_VIEW_BILLING,
        Permission.ORG_MANAGE_BILLING,
        Permission.DOMAIN_CREATE,
        Permission.DOMAIN_VIEW,
        Permission.DOMAIN_EDIT,
        Permission.DOMAIN_DELETE,
        Permission.DOMAIN_VERIFY,
        Permission.INBOX_CREATE,
        Permission.INBOX_VIEW,
        Permission.INBOX_EDIT,
        Permission.INBOX_DELETE,
        Permission.EMAIL_VIEW,
        Permission.EMAIL_DELETE,
        Permission.EMAIL_EXPORT,
        Permission.API_VIEW_KEYS,
        Permission.API_CREATE_KEYS,
        Permission.API_EDIT_KEYS,
        Permission.API_DELETE_KEYS,
        Permission.WEBHOOK_VIEW,
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_EDIT,
        Permission.WEBHOOK_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
      ],
      [OrganizationRole.ADMIN]: [
        Permission.ORG_VIEW,
        Permission.ORG_EDIT,
        Permission.ORG_INVITE,
        Permission.ORG_MANAGE_MEMBERS,
        Permission.ORG_VIEW_SETTINGS,
        Permission.ORG_EDIT_SETTINGS,
        Permission.ORG_VIEW_BILLING,
        Permission.DOMAIN_CREATE,
        Permission.DOMAIN_VIEW,
        Permission.DOMAIN_EDIT,
        Permission.DOMAIN_DELETE,
        Permission.DOMAIN_VERIFY,
        Permission.INBOX_CREATE,
        Permission.INBOX_VIEW,
        Permission.INBOX_EDIT,
        Permission.INBOX_DELETE,
        Permission.EMAIL_VIEW,
        Permission.EMAIL_DELETE,
        Permission.EMAIL_EXPORT,
        Permission.API_VIEW_KEYS,
        Permission.API_CREATE_KEYS,
        Permission.API_EDIT_KEYS,
        Permission.API_DELETE_KEYS,
        Permission.WEBHOOK_VIEW,
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_EDIT,
        Permission.WEBHOOK_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
      ],
      [OrganizationRole.MEMBER]: [
        Permission.ORG_VIEW,
        Permission.DOMAIN_VIEW,
        Permission.INBOX_CREATE,
        Permission.INBOX_VIEW,
        Permission.INBOX_EDIT,
        Permission.EMAIL_VIEW,
        Permission.EMAIL_DELETE,
        Permission.API_VIEW_KEYS,
        Permission.ANALYTICS_VIEW,
      ],
      [OrganizationRole.VIEWER]: [
        Permission.ORG_VIEW,
        Permission.DOMAIN_VIEW,
        Permission.INBOX_VIEW,
        Permission.EMAIL_VIEW,
        Permission.ANALYTICS_VIEW,
      ],
    };

    // Update existing organizations to have proper default settings
    const organizations = await prisma.organization.findMany({
      include: {
        settingsObj: true,
      },
    });

    console.log(`Updating ${organizations.length} organizations with default settings...`);

    for (const org of organizations) {
      // Create or update organization settings
      await prisma.organizationSettings.upsert({
        where: { organizationId: org.id },
        update: {
          apiAccessEnabled: true,
          webhooksEnabled: false,
          ssoEnabled: false,
          maxDomains: org.subscriptions[0]?.tier === 'FREE' ? 1 : null,
          maxInboxes: org.subscriptions[0]?.tier === 'FREE' ? 5 : null,
          maxMembers: org.subscriptions[0]?.tier === 'FREE' ? 2 : null,
          maxApiKeys: org.subscriptions[0]?.tier === 'FREE' ? 1 : null,
          require2FA: false,
          sessionTimeout: 480,
        },
        create: {
          organizationId: org.id,
          apiAccessEnabled: true,
          webhooksEnabled: false,
          ssoEnabled: false,
          maxDomains: org.subscriptions[0]?.tier === 'FREE' ? 1 : null,
          maxInboxes: org.subscriptions[0]?.tier === 'FREE' ? 5 : null,
          maxMembers: org.subscriptions[0]?.tier === 'FREE' ? 2 : null,
          maxApiKeys: org.subscriptions[0]?.tier === 'FREE' ? 1 : null,
          require2FA: false,
          sessionTimeout: 480,
        },
      });
    }

    // Ensure all organization members have proper roles
    const members = await prisma.organizationMember.findMany();
    console.log(`Checking ${members.length} organization members...`);

    for (const member of members) {
      // If member has no role, set to MEMBER
      if (!member.role) {
        await prisma.organizationMember.update({
          where: { id: member.id },
          data: { role: OrganizationRole.MEMBER },
        });
        console.log(`Updated member ${member.id} to MEMBER role`);
      }
    }

    // Check for domains without owners (individual domains) and ensure they're accessible
    const domainsWithoutOrg = await prisma.domain.findMany({
      where: { organizationId: null },
    });

    console.log(`Found ${domainsWithoutOrg.length} personal domains...`);

    // Create audit log entries for RBAC setup
    await prisma.auditLog.create({
      data: {
        action: 'RBAC_SETUP_COMPLETED',
        meta: {
          timestamp: new Date().toISOString(),
          organizationsUpdated: organizations.length,
          membersChecked: members.length,
          domainsChecked: domainsWithoutOrg.length,
        },
      },
    });

    console.log('✅ RBAC setup completed successfully!');
    console.log(`- Organizations updated: ${organizations.length}`);
    console.log(`- Members checked: ${members.length}`);
    console.log(`- Personal domains: ${domainsWithoutOrg.length}`);

  } catch (error) {
    console.error('❌ Error setting up RBAC:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  setupRBAC()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupRBAC };