/**
 * Hosting Provider Service
 * Core business logic for hosting provider API operations
 * Manages tenants, domains, mailboxes, and usage metrics
 */

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { TenantPlan, TenantStatus, ProviderTier } from '@prisma/client';
import { generateProviderApiKey } from '../middleware/provider-auth';

// Plan limits configuration
const PLAN_LIMITS = {
  LITE: { mailboxes: 5, storageGb: 1 },
  PRO: { mailboxes: 999, storageGb: 10 },
  BUSINESS: { mailboxes: 999, storageGb: 50 },
} as const;

// Tier limits configuration
const TIER_LIMITS = {
  STARTER: { maxTenants: 100, maxMailboxes: 1000, maxStorageGb: 100 },
  GROWTH: { maxTenants: 500, maxMailboxes: 5000, maxStorageGb: 500 },
  ENTERPRISE: { maxTenants: 999999, maxMailboxes: 999999, maxStorageGb: 999999 },
} as const;

export class HostingProviderService {
  /**
   * Register a new hosting provider
   */
  static async registerProvider(data: {
    name: string;
    contactEmail: string;
    billingEmail?: string;
    webhookUrl?: string;
    tier?: ProviderTier;
  }) {
    const { key, hash, prefix } = generateProviderApiKey();
    const tier = data.tier || 'STARTER';
    const limits = TIER_LIMITS[tier];

    const provider = await prisma.hostingProvider.create({
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        billingEmail: data.billingEmail,
        webhookUrl: data.webhookUrl,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        tier,
        maxTenants: limits.maxTenants,
        maxMailboxes: limits.maxMailboxes,
        maxStorageGb: limits.maxStorageGb,
        status: 'ACTIVE',
      },
    });

    // Return provider info with API key (only shown once)
    return {
      provider: {
        id: provider.id,
        name: provider.name,
        tier: provider.tier,
        status: provider.status,
      },
      apiKey: key, // Only returned on creation
    };
  }

  /**
   * Get provider info
   */
  static async getProvider(providerId: string) {
    return prisma.hostingProvider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        billingEmail: true,
        tier: true,
        status: true,
        maxTenants: true,
        maxMailboxes: true,
        maxStorageGb: true,
        webhookUrl: true,
        createdAt: true,
        _count: {
          select: { tenants: true },
        },
      },
    });
  }

  /**
   * Regenerate API key for provider
   */
  static async regenerateApiKey(providerId: string) {
    const { key, hash, prefix } = generateProviderApiKey();

    await prisma.hostingProvider.update({
      where: { id: providerId },
      data: {
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
      },
    });

    return { apiKey: key };
  }

  /**
   * Create a new tenant for provider
   */
  static async createTenant(
    providerId: string,
    data: {
      externalId: string;
      customerEmail: string;
      customerName?: string;
      plan: TenantPlan;
    }
  ) {
    const planLimits = PLAN_LIMITS[data.plan];

    // Check provider tenant limit
    const provider = await prisma.hostingProvider.findUnique({
      where: { id: providerId },
      select: { maxTenants: true, _count: { select: { tenants: true } } },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider._count.tenants >= provider.maxTenants) {
      throw new Error(`Tenant limit reached (${provider.maxTenants})`);
    }

    // Create organization for tenant
    const orgSlug = `provider-${providerId.slice(0, 8)}-${data.externalId}`.toLowerCase();
    const org = await prisma.organization.create({
      data: {
        name: data.customerName || data.customerEmail,
        slug: orgSlug,
      },
    });

    // Create tenant linked to organization
    const tenant = await prisma.providerTenant.create({
      data: {
        providerId,
        externalId: data.externalId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        plan: data.plan,
        maxMailboxes: planLimits.mailboxes,
        maxStorageGb: planLimits.storageGb,
        organizationId: org.id,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        domains: true,
      },
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  static async getTenant(providerId: string, tenantId: string) {
    return prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
      include: {
        domains: { include: { domain: true } },
        organization: true,
      },
    });
  }

  /**
   * List tenants for provider
   */
  static async listTenants(
    providerId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: TenantStatus;
    } = {}
  ) {
    const { limit = 50, offset = 0, status } = options;

    const [tenants, total] = await Promise.all([
      prisma.providerTenant.findMany({
        where: {
          providerId,
          ...(status ? { status } : {}),
        },
        take: limit,
        skip: offset,
        include: {
          domains: true,
          _count: { select: { domains: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.providerTenant.count({
        where: { providerId, ...(status ? { status } : {}) },
      }),
    ]);

    return { tenants, total, limit, offset };
  }

  /**
   * Update tenant
   */
  static async updateTenant(
    providerId: string,
    tenantId: string,
    data: {
      customerName?: string;
      customerEmail?: string;
      plan?: TenantPlan;
    }
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.customerName) updateData.customerName = data.customerName;
    if (data.customerEmail) updateData.customerEmail = data.customerEmail;
    if (data.plan) {
      const limits = PLAN_LIMITS[data.plan];
      updateData.plan = data.plan;
      updateData.maxMailboxes = limits.mailboxes;
      updateData.maxStorageGb = limits.storageGb;
    }

    return prisma.providerTenant.update({
      where: { id: tenantId, providerId },
      data: updateData,
      include: { domains: true, organization: true },
    });
  }

  /**
   * Suspend tenant
   */
  static async suspendTenant(providerId: string, tenantId: string) {
    const result = await prisma.providerTenant.updateMany({
      where: { id: tenantId, providerId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });

    if (result.count === 0) {
      throw new Error('Tenant not found or already suspended');
    }

    return { status: 'SUSPENDED' };
  }

  /**
   * Unsuspend tenant
   */
  static async unsuspendTenant(providerId: string, tenantId: string) {
    const result = await prisma.providerTenant.updateMany({
      where: { id: tenantId, providerId, status: 'SUSPENDED' },
      data: { status: 'ACTIVE', suspendedAt: null },
    });

    if (result.count === 0) {
      throw new Error('Tenant not found or not suspended');
    }

    return { status: 'ACTIVE' };
  }

  /**
   * Terminate tenant (soft delete)
   */
  static async terminateTenant(providerId: string, tenantId: string) {
    const result = await prisma.providerTenant.updateMany({
      where: { id: tenantId, providerId },
      data: { status: 'TERMINATED', terminatedAt: new Date() },
    });

    if (result.count === 0) {
      throw new Error('Tenant not found');
    }

    return { status: 'TERMINATED' };
  }

  /**
   * Add domain to tenant
   */
  static async addDomain(providerId: string, tenantId: string, domainName: string) {
    const tenant = await prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
      include: { organization: true },
    });

    if (!tenant || !tenant.organizationId) {
      throw new Error('Tenant not found');
    }

    const normalizedDomain = domainName.toLowerCase().trim();

    // Check if domain already exists
    const existingDomain = await prisma.domain.findUnique({
      where: { name: normalizedDomain },
    });

    if (existingDomain) {
      throw new Error('Domain already exists in the system');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(16).toString('hex');

    // Create domain in main system
    const domain = await prisma.domain.create({
      data: {
        name: normalizedDomain,
        organizationId: tenant.organizationId,
        status: 'PENDING',
        isPublic: false,
        verificationToken,
      },
    });

    // Link to tenant
    const tenantDomain = await prisma.providerTenantDomain.create({
      data: {
        tenantId,
        domainName: normalizedDomain,
        domainId: domain.id,
      },
    });

    // Generate DNS records for verification
    const dnsRecords = this.generateDnsRecords(verificationToken, normalizedDomain);

    return { domain: tenantDomain, dnsRecords };
  }

  /**
   * List domains for tenant
   */
  static async listDomains(providerId: string, tenantId: string) {
    const tenant = await prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return prisma.providerTenantDomain.findMany({
      where: { tenantId },
      include: { domain: true },
    });
  }

  /**
   * Get DNS records for domain
   */
  static async getDomainDns(providerId: string, tenantId: string, domainName: string) {
    const tenantDomain = await prisma.providerTenantDomain.findFirst({
      where: {
        tenantId,
        domainName: domainName.toLowerCase(),
        tenant: { providerId },
      },
      include: { domain: true },
    });

    if (!tenantDomain) {
      throw new Error('Domain not found');
    }

    const dnsRecords = this.generateDnsRecords(
      tenantDomain.domain?.verificationToken || '',
      domainName
    );

    return {
      domain: tenantDomain,
      dnsRecords,
      verified: tenantDomain.verified,
    };
  }

  /**
   * Verify domain ownership
   */
  static async verifyDomain(providerId: string, tenantId: string, domainName: string) {
    const tenantDomain = await prisma.providerTenantDomain.findFirst({
      where: {
        tenantId,
        domainName: domainName.toLowerCase(),
        tenant: { providerId },
      },
      include: { domain: true },
    });

    if (!tenantDomain || !tenantDomain.domain) {
      throw new Error('Domain not found');
    }

    // Update domain and tenant domain as verified
    await prisma.$transaction([
      prisma.domain.update({
        where: { id: tenantDomain.domain.id },
        data: { status: 'VERIFIED' },
      }),
      prisma.providerTenantDomain.update({
        where: { id: tenantDomain.id },
        data: { verified: true, verifiedAt: new Date() },
      }),
    ]);

    return { verified: true, domainName };
  }

  /**
   * Remove domain from tenant
   */
  static async removeDomain(providerId: string, tenantId: string, domainName: string) {
    const tenantDomain = await prisma.providerTenantDomain.findFirst({
      where: {
        tenantId,
        domainName: domainName.toLowerCase(),
        tenant: { providerId },
      },
    });

    if (!tenantDomain) {
      throw new Error('Domain not found');
    }

    // Delete tenant domain link (domain stays for audit)
    await prisma.providerTenantDomain.delete({
      where: { id: tenantDomain.id },
    });

    return { removed: true };
  }

  /**
   * Create mailbox for tenant
   */
  static async createMailbox(
    providerId: string,
    tenantId: string,
    data: {
      localPart: string;
      domain: string;
      password: string;
      displayName?: string;
      quotaMb?: number;
    }
  ) {
    const tenant = await prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
      include: {
        domains: { include: { domain: true } },
        organization: true,
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check domain belongs to tenant
    const tenantDomain = tenant.domains.find(
      (d) => d.domainName === data.domain.toLowerCase()
    );

    if (!tenantDomain || !tenantDomain.domainId) {
      throw new Error('Domain not found or not verified');
    }

    // Check mailbox limit
    const currentCount = await prisma.inbox.count({
      where: {
        domain: { organizationId: tenant.organizationId },
        deletedAt: null,
      },
    });

    if (currentCount >= tenant.maxMailboxes) {
      throw new Error(`Mailbox limit reached (${tenant.maxMailboxes})`);
    }

    // Check if inbox already exists
    const existingInbox = await prisma.inbox.findFirst({
      where: {
        localPart: data.localPart.toLowerCase(),
        domainId: tenantDomain.domainId,
        deletedAt: null,
      },
    });

    if (existingInbox) {
      throw new Error('Mailbox already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create inbox (mailbox)
    const inbox = await prisma.inbox.create({
      data: {
        localPart: data.localPart.toLowerCase(),
        domainId: tenantDomain.domainId,
        organizationId: tenant.organizationId,
        flags: {
          displayName: data.displayName,
          quotaMb: data.quotaMb || PLAN_LIMITS[tenant.plan].storageGb * 1024,
          passwordHash,
        },
      },
      include: { domain: true },
    });

    return {
      email: `${inbox.localPart}@${inbox.domain.name}`,
      displayName: data.displayName,
      quotaMb: data.quotaMb || PLAN_LIMITS[tenant.plan].storageGb * 1024,
      createdAt: inbox.createdAt,
    };
  }

  /**
   * List mailboxes for tenant
   */
  static async listMailboxes(providerId: string, tenantId: string) {
    const tenant = await prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
      include: { organization: true },
    });

    if (!tenant || !tenant.organizationId) {
      throw new Error('Tenant not found');
    }

    const inboxes = await prisma.inbox.findMany({
      where: {
        organizationId: tenant.organizationId,
        deletedAt: null,
      },
      include: { domain: true },
    });

    return inboxes.map((inbox) => ({
      email: `${inbox.localPart}@${inbox.domain.name}`,
      displayName: (inbox.flags as Record<string, unknown>)?.displayName || null,
      quotaMb: (inbox.flags as Record<string, unknown>)?.quotaMb || null,
      createdAt: inbox.createdAt,
    }));
  }

  /**
   * Delete mailbox
   */
  static async deleteMailbox(
    providerId: string,
    tenantId: string,
    email: string
  ) {
    const [localPart, domain] = email.toLowerCase().split('@');

    const tenant = await prisma.providerTenant.findFirst({
      where: { id: tenantId, providerId },
      include: { domains: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const tenantDomain = tenant.domains.find((d) => d.domainName === domain);
    if (!tenantDomain || !tenantDomain.domainId) {
      throw new Error('Domain not found');
    }

    const inbox = await prisma.inbox.findFirst({
      where: {
        localPart,
        domainId: tenantDomain.domainId,
        deletedAt: null,
      },
    });

    if (!inbox) {
      throw new Error('Mailbox not found');
    }

    // Soft delete
    await prisma.inbox.update({
      where: { id: inbox.id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  /**
   * Get usage metrics for provider or tenant
   * Uses aggregation queries for performance
   */
  static async getUsage(providerId: string, tenantId?: string) {
    const currentPeriod = new Date();
    currentPeriod.setDate(1);
    currentPeriod.setHours(0, 0, 0, 0);

    // Get tenant count
    const tenantCount = await prisma.providerTenant.count({
      where: {
        providerId,
        ...(tenantId ? { id: tenantId } : {}),
        status: { not: 'TERMINATED' },
      },
    });

    // Get organization IDs for the provider's tenants
    const tenants = await prisma.providerTenant.findMany({
      where: {
        providerId,
        ...(tenantId ? { id: tenantId } : {}),
        status: { not: 'TERMINATED' },
      },
      select: {
        id: true,
        externalId: true,
        organizationId: true,
      },
    });

    const orgIds = tenants
      .map((t) => t.organizationId)
      .filter((id): id is string => id !== null);

    // Aggregate mailbox count
    const mailboxCount = orgIds.length > 0
      ? await prisma.inbox.count({
          where: {
            organizationId: { in: orgIds },
            deletedAt: null,
          },
        })
      : 0;

    // Aggregate message count
    const messageCount = orgIds.length > 0
      ? await prisma.message.count({
          where: {
            inbox: {
              organizationId: { in: orgIds },
              deletedAt: null,
            },
          },
        })
      : 0;

    // Per-tenant breakdown (only if not filtering by single tenant)
    let byTenant: Array<{
      tenantId: string;
      externalId: string;
      mailboxes: number;
      messages: number;
    }> | undefined;

    if (!tenantId && tenants.length <= 100) {
      // Only compute per-tenant for reasonable counts
      byTenant = await Promise.all(
        tenants.map(async (tenant) => {
          if (!tenant.organizationId) {
            return {
              tenantId: tenant.id,
              externalId: tenant.externalId,
              mailboxes: 0,
              messages: 0,
            };
          }

          const [mboxCount, msgCount] = await Promise.all([
            prisma.inbox.count({
              where: { organizationId: tenant.organizationId, deletedAt: null },
            }),
            prisma.message.count({
              where: {
                inbox: { organizationId: tenant.organizationId, deletedAt: null },
              },
            }),
          ]);

          return {
            tenantId: tenant.id,
            externalId: tenant.externalId,
            mailboxes: mboxCount,
            messages: msgCount,
          };
        })
      );
    }

    return {
      period: currentPeriod.toISOString(),
      summary: {
        tenants: tenantCount,
        mailboxes: mailboxCount,
        messages: messageCount,
      },
      ...(byTenant ? { byTenant } : {}),
    };
  }

  /**
   * Generate DNS records for domain verification
   */
  private static generateDnsRecords(verificationToken: string, domainName: string) {
    return [
      {
        type: 'TXT',
        name: `_ephemera.${domainName}`,
        value: `ephemera-verify=${verificationToken}`,
        purpose: 'Domain verification',
      },
      {
        type: 'MX',
        name: domainName,
        value: 'mail.ephemera.email',
        priority: 10,
        purpose: 'Mail routing',
      },
      {
        type: 'TXT',
        name: domainName,
        value: 'v=spf1 include:spf.ephemera.email ~all',
        purpose: 'SPF record',
      },
      {
        type: 'CNAME',
        name: `mail._domainkey.${domainName}`,
        value: 'dkim.ephemera.email',
        purpose: 'DKIM signing',
      },
    ];
  }
}
