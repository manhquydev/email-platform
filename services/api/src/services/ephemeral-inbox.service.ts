/**
 * Ephemeral Inbox Service - Zero-friction public inboxes
 * Phase 5: Public Ephemeral Inbox
 */

import { prisma } from "../lib/prisma";
import crypto from "crypto";
import { validateAlias, sanitizeAlias } from "../lib/alias-validation";

const DEFAULT_EXPIRY_HOURS = 2;
const EPHEMERAL_DOMAIN = process.env.EPHEMERAL_DOMAIN || "ephemera.email";
const CLEANUP_BATCH_SIZE = 1000; // Process in batches to avoid memory issues

// Premium domains require STARTER+ subscription (comma-separated list from env)
const PREMIUM_DOMAINS = (process.env.PREMIUM_DOMAINS || "").split(",").filter(Boolean).map(d => d.trim().toLowerCase());

// Domain cache to avoid repeated DB lookups
let cachedDomainId: string | null = null;

// Options for creating ephemeral inbox
export interface CreateEphemeralInboxOptions {
  expiryHours?: number;
  localPart?: string;  // Custom alias (optional)
  domainId?: string;   // Specific domain (optional)
  anonymousAccountId?: string;  // Track anonymous session for ownership transfer
}

export interface EphemeralInbox {
  id: string;
  token: string;
  address: string;
  localPart: string;
  domain: string;
  expiresAt: Date;
  createdAt: Date;
  messageCount: number;
}

/**
 * Generate random local part for ephemeral inbox
 */
function generateLocalPart(): string {
  const adjectives = ['swift', 'bright', 'calm', 'dark', 'eager', 'fair', 'glad', 'keen', 'mild', 'pure', 'quick', 'rare', 'safe', 'tall', 'warm'];
  const nouns = ['tiger', 'river', 'cloud', 'stone', 'flame', 'frost', 'wind', 'wave', 'star', 'moon', 'bird', 'fish', 'leaf', 'tree', 'rain'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}

/**
 * Generate secure session token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export const ephemeralInboxService = {
  /**
   * Create a new ephemeral inbox
   * @param options - Optional configuration for custom alias and domain
   */
  async create(options: CreateEphemeralInboxOptions = {}): Promise<EphemeralInbox> {
    const { expiryHours = DEFAULT_EXPIRY_HOURS, localPart: customAlias, domainId: customDomainId, anonymousAccountId } = options;

    // Resolve domain (custom or default)
    let domainId: string;
    let domainName: string;

    if (customDomainId) {
      // Use custom domain if provided
      const domain = await prisma.domain.findFirst({
        where: { id: customDomainId, isPublic: true },
      });
      if (!domain) {
        throw new Error('Invalid or unavailable domain');
      }
      domainId = domain.id;
      domainName = domain.name;
    } else {
      // Use default ephemeral domain (with caching)
      if (!cachedDomainId) {
        let domain = await prisma.domain.findFirst({
          where: { name: EPHEMERAL_DOMAIN, isPublic: true },
        });

        // Create domain if not exists (for development)
        if (!domain) {
          domain = await prisma.domain.upsert({
            where: { name: EPHEMERAL_DOMAIN },
            update: { isPublic: true },
            create: {
              name: EPHEMERAL_DOMAIN,
              isPublic: true,
              status: "VERIFIED",
              verificationToken: crypto.randomBytes(16).toString('hex'),
            },
          });
        }
        cachedDomainId = domain.id;
      }
      domainId = cachedDomainId;
      domainName = EPHEMERAL_DOMAIN;
    }

    // Resolve local part (custom alias or random)
    let localPart: string;
    const isCustomAlias = !!customAlias;

    if (customAlias) {
      // Validate custom alias
      const validation = validateAlias(customAlias);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid alias format');
      }
      localPart = sanitizeAlias(customAlias);

      // Check uniqueness within domain (pre-check for better UX)
      const existing = await prisma.inbox.findFirst({
        where: {
          localPart,
          domainId,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new Error('This alias is already taken for this domain');
      }
    } else {
      // Generate random alias (will be assigned in retry loop)
      localPart = generateLocalPart();
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Create inbox with retry logic for collision handling
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const inbox = await prisma.inbox.create({
          data: {
            localPart,
            domainId,
            expiresAt,
            anonymousAccountId: anonymousAccountId || null,  // Track anonymous session
            ownerId: null,  // Always null for public ephemeral inboxes
            flags: {
              isEphemeral: true,
              token,
              createdVia: 'public',
              isCustomAlias,
            },
          },
          include: { domain: true },
        });

        return {
          id: inbox.id,
          token,
          address: `${localPart}@${inbox.domain.name}`,
          localPart,
          domain: inbox.domain.name,
          expiresAt,
          createdAt: inbox.createdAt,
          messageCount: 0,
        };
      } catch (error: any) {
        // Handle unique constraint violation (race condition or random collision)
        if (error.code === 'P2002') {
          if (isCustomAlias) {
            // Custom alias collision (race condition) - don't retry
            throw new Error('This alias is already taken for this domain');
          }
          // Random alias collision - regenerate and retry
          localPart = generateLocalPart();
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    // All retries exhausted (should be rare)
    throw lastError || new Error('Failed to create inbox after retries');
  },

  /**
   * Get inbox by session token
   */
  async getByToken(token: string): Promise<EphemeralInbox | null> {
    const inbox = await prisma.inbox.findFirst({
      where: {
        flags: { path: ['token'], equals: token },
        deletedAt: null,
      },
      include: {
        domain: true,
        _count: { select: { messages: true } },
      },
    });

    if (!inbox) return null;

    // Check if expired
    if (inbox.expiresAt && inbox.expiresAt < new Date()) {
      return null;
    }

    return {
      id: inbox.id,
      token,
      address: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain.name,
      expiresAt: inbox.expiresAt!,
      createdAt: inbox.createdAt,
      messageCount: inbox._count.messages,
    };
  },

  /**
   * Get or create inbox by token
   */
  async getOrCreate(token?: string): Promise<EphemeralInbox> {
    if (token) {
      const existing = await this.getByToken(token);
      if (existing) return existing;
    }
    return this.create();
  },

  /**
   * Extend inbox expiry
   */
  async extendExpiry(token: string, additionalHours = DEFAULT_EXPIRY_HOURS): Promise<EphemeralInbox | null> {
    const inbox = await prisma.inbox.findFirst({
      where: {
        flags: { path: ['token'], equals: token },
        deletedAt: null,
      },
    });

    if (!inbox) return null;

    const newExpiry = new Date(Date.now() + additionalHours * 60 * 60 * 1000);

    await prisma.inbox.update({
      where: { id: inbox.id },
      data: { expiresAt: newExpiry },
    });

    return this.getByToken(token);
  },

  /**
   * Get messages for ephemeral inbox
   */
  async getMessages(token: string, limit = 50, offset = 0) {
    const inbox = await prisma.inbox.findFirst({
      where: {
        flags: { path: ['token'], equals: token },
        deletedAt: null,
      },
    });

    if (!inbox) return { data: [], total: 0 };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { inboxId: inbox.id },
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          fromAddress: true,
          subject: true,
          receivedAt: true,
          isRead: true,
          extractedOtp: true,
          htmlBody: true,
          textBody: true,
        },
      }),
      prisma.message.count({ where: { inboxId: inbox.id } }),
    ]);

    return { data: messages, total };
  },

  /**
   * Cleanup expired ephemeral inboxes (processes in batches to avoid memory issues)
   */
  async cleanupExpired(): Promise<{ deletedInboxes: number; deletedMessages: number }> {
    const now = new Date();
    let totalDeletedInboxes = 0;
    let totalDeletedMessages = 0;

    // Process in batches until no more expired inboxes
    while (true) {
      // Find expired ephemeral inboxes (batch limited)
      const expiredInboxes = await prisma.inbox.findMany({
        where: {
          flags: { path: ['isEphemeral'], equals: true },
          expiresAt: { lt: now },
          deletedAt: null,
        },
        select: { id: true },
        take: CLEANUP_BATCH_SIZE,
      });

      if (expiredInboxes.length === 0) {
        break; // No more expired inboxes
      }

      const inboxIds = expiredInboxes.map(i => i.id);

      // Delete messages first (FK constraint)
      const messagesDeleted = await prisma.message.deleteMany({
        where: { inboxId: { in: inboxIds } },
      });

      // Soft delete inboxes
      await prisma.inbox.updateMany({
        where: { id: { in: inboxIds } },
        data: { deletedAt: now },
      });

      totalDeletedInboxes += inboxIds.length;
      totalDeletedMessages += messagesDeleted.count;

      // If we got less than batch size, we're done
      if (expiredInboxes.length < CLEANUP_BATCH_SIZE) {
        break;
      }
    }

    return {
      deletedInboxes: totalDeletedInboxes,
      deletedMessages: totalDeletedMessages,
    };
  },

  /**
   * Get cleanup stats
   */
  async getStats(): Promise<{
    activeEphemeral: number;
    expiringIn10Min: number;
    totalMessages: number;
  }> {
    const now = new Date();
    const in10Min = new Date(now.getTime() + 10 * 60 * 1000);

    const [activeEphemeral, expiringIn10Min, totalMessages] = await Promise.all([
      prisma.inbox.count({
        where: {
          flags: { path: ['isEphemeral'], equals: true },
          expiresAt: { gt: now },
          deletedAt: null,
        },
      }),
      prisma.inbox.count({
        where: {
          flags: { path: ['isEphemeral'], equals: true },
          expiresAt: { gt: now, lt: in10Min },
          deletedAt: null,
        },
      }),
      prisma.message.count({
        where: {
          inbox: {
            flags: { path: ['isEphemeral'], equals: true },
            deletedAt: null,
          },
        },
      }),
    ]);

    return { activeEphemeral, expiringIn10Min, totalMessages };
  },

  /**
   * Get list of public domains available for ephemeral inboxes
   */
  async getPublicDomains(): Promise<{ id: string; name: string; isPremium: boolean }[]> {
    const domains = await prisma.domain.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    // Mark domains as premium based on env config
    return domains.map(d => ({
      id: d.id,
      name: d.name,
      isPremium: PREMIUM_DOMAINS.includes(d.name.toLowerCase()),
    }));
  },

  /**
   * Check if alias is available for a domain
   */
  async checkAliasAvailability(localPart: string, domainId: string): Promise<{ available: boolean; error?: string }> {
    const validation = validateAlias(localPart);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    const sanitized = sanitizeAlias(localPart);
    const existing = await prisma.inbox.findFirst({
      where: {
        localPart: sanitized,
        domainId,
        deletedAt: null,
      },
    });

    return { available: !existing };
  },
};
