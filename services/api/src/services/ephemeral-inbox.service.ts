/**
 * Ephemeral Inbox Service - Zero-friction public inboxes
 * Phase 5: Public Ephemeral Inbox
 */

import { prisma } from "../lib/prisma";
import crypto from "crypto";

const DEFAULT_EXPIRY_HOURS = 2;
const EPHEMERAL_DOMAIN = process.env.EPHEMERAL_DOMAIN || "ephemera.email";
const CLEANUP_BATCH_SIZE = 1000; // Process in batches to avoid memory issues

// Domain cache to avoid repeated DB lookups
let cachedDomainId: string | null = null;

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
   */
  async create(expiryHours = DEFAULT_EXPIRY_HOURS): Promise<EphemeralInbox> {
    // Use cached domain ID if available
    let domainId = cachedDomainId;
    let domainName = EPHEMERAL_DOMAIN;

    if (!domainId) {
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

      domainId = domain.id;
      domainName = domain.name;
      cachedDomainId = domainId; // Cache for future calls
    }

    const localPart = generateLocalPart();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Create inbox with ephemeral flag
    const inbox = await prisma.inbox.create({
      data: {
        localPart,
        domainId,
        expiresAt,
        flags: {
          isEphemeral: true,
          token,
          createdVia: 'public',
        },
      },
      include: { domain: true },
    });

    return {
      id: inbox.id,
      token,
      address: `${localPart}@${domainName}`,
      localPart,
      domain: domainName,
      expiresAt,
      createdAt: inbox.createdAt,
      messageCount: 0,
    };
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
        },
      }),
      prisma.message.count({ where: { inboxId: inbox.id } }),
    ]);

    return { data: messages, total };
  },

  /**
   * Cleanup expired ephemeral inboxes
   */
  async cleanupExpired(): Promise<{ deletedInboxes: number; deletedMessages: number }> {
    const now = new Date();

    // Find expired ephemeral inboxes
    const expiredInboxes = await prisma.inbox.findMany({
      where: {
        flags: { path: ['isEphemeral'], equals: true },
        expiresAt: { lt: now },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (expiredInboxes.length === 0) {
      return { deletedInboxes: 0, deletedMessages: 0 };
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

    return {
      deletedInboxes: inboxIds.length,
      deletedMessages: messagesDeleted.count,
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
};
