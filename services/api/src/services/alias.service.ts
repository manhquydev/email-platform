/**
 * Alias Service - Permanent email aliases with two-way forwarding
 * Phase 4: Identity Suite Bundles
 */

import { prisma } from "../lib/prisma";
import crypto from "crypto";

export interface AliasCreateInput {
  userId: string;
  localPart?: string; // Custom alias name, auto-generated if not provided
  domainId: string;
  forwardTo: string; // Real email to forward to (encrypted)
  label?: string;
}

export interface Alias {
  id: string;
  email: string;
  localPart: string;
  domain: string;
  forwardTo: string;
  isActive: boolean;
  forwardCount: number;
  replyCount: number;
  createdAt: Date;
  lastUsedAt: Date | null;
}

// Simple encryption for forward addresses (use proper KMS in production)
// SECURITY: Require encryption key in production to prevent data loss on restart
const ENCRYPTION_KEY = (() => {
  const key = process.env.ALIAS_ENCRYPTION_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('ALIAS_ENCRYPTION_KEY is required in production');
  }
  return key || 'dev-only-key-do-not-use-in-prod!';
})();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateAliasLocalPart(): string {
  // Generate readable alias like "swift.tiger.42"
  const adjectives = ['swift', 'bright', 'calm', 'dark', 'eager', 'fair', 'glad', 'keen', 'mild', 'pure'];
  const nouns = ['tiger', 'river', 'cloud', 'stone', 'flame', 'frost', 'wind', 'wave', 'star', 'moon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}.${noun}.${num}`;
}

export const aliasService = {
  /**
   * Create a new permanent alias
   */
  async create(input: AliasCreateInput): Promise<Alias> {
    const localPart = input.localPart || generateAliasLocalPart();
    const encryptedForwardTo = encrypt(input.forwardTo);

    // Create inbox with alias flag
    const inbox = await prisma.inbox.create({
      data: {
        localPart,
        domainId: input.domainId,
        ownerId: input.userId,
        expiresAt: null, // Permanent - no expiration
        flags: {
          isAlias: true,
          forwardTo: encryptedForwardTo,
          isActive: true,
          forwardCount: 0,
          replyCount: 0,
          label: input.label || null,
        },
      },
      include: { domain: true },
    });

    return this.formatAlias(inbox);
  },

  /**
   * Get all aliases for a user
   */
  async listByUser(userId: string): Promise<Alias[]> {
    const inboxes = await prisma.inbox.findMany({
      where: {
        ownerId: userId,
        flags: { path: ['isAlias'], equals: true },
        deletedAt: null,
      },
      include: { domain: true },
      orderBy: { createdAt: 'desc' },
    });

    return inboxes.map(inbox => this.formatAlias(inbox));
  },

  /**
   * Get alias by ID
   */
  async getById(aliasId: string, userId: string): Promise<Alias | null> {
    const inbox = await prisma.inbox.findFirst({
      where: {
        id: aliasId,
        ownerId: userId,
        flags: { path: ['isAlias'], equals: true },
        deletedAt: null,
      },
      include: { domain: true },
    });

    return inbox ? this.formatAlias(inbox) : null;
  },

  /**
   * Toggle alias active status (enable/disable without deletion)
   */
  async toggleActive(aliasId: string, userId: string): Promise<Alias | null> {
    const inbox = await prisma.inbox.findFirst({
      where: {
        id: aliasId,
        ownerId: userId,
        flags: { path: ['isAlias'], equals: true },
      },
    });

    if (!inbox) return null;

    const flags = inbox.flags as any;
    const newFlags = { ...flags, isActive: !flags.isActive };

    const updated = await prisma.inbox.update({
      where: { id: aliasId },
      data: { flags: newFlags },
      include: { domain: true },
    });

    return this.formatAlias(updated);
  },

  /**
   * Update forward destination
   */
  async updateForwardTo(aliasId: string, userId: string, newForwardTo: string): Promise<Alias | null> {
    const inbox = await prisma.inbox.findFirst({
      where: {
        id: aliasId,
        ownerId: userId,
        flags: { path: ['isAlias'], equals: true },
      },
    });

    if (!inbox) return null;

    const flags = inbox.flags as any;
    const newFlags = { ...flags, forwardTo: encrypt(newForwardTo) };

    const updated = await prisma.inbox.update({
      where: { id: aliasId },
      data: { flags: newFlags },
      include: { domain: true },
    });

    return this.formatAlias(updated);
  },

  /**
   * Increment forward count when email is forwarded
   */
  async incrementForwardCount(aliasId: string): Promise<void> {
    const inbox = await prisma.inbox.findUnique({ where: { id: aliasId } });
    if (!inbox) return;

    const flags = inbox.flags as any;
    const newFlags = { ...flags, forwardCount: (flags.forwardCount || 0) + 1 };

    await prisma.inbox.update({
      where: { id: aliasId },
      data: { flags: newFlags },
    });
  },

  /**
   * Increment reply count when reply is sent via alias
   */
  async incrementReplyCount(aliasId: string): Promise<void> {
    const inbox = await prisma.inbox.findUnique({ where: { id: aliasId } });
    if (!inbox) return;

    const flags = inbox.flags as any;
    const newFlags = { ...flags, replyCount: (flags.replyCount || 0) + 1 };

    await prisma.inbox.update({
      where: { id: aliasId },
      data: { flags: newFlags },
    });
  },

  /**
   * Get forward destination for an alias (decrypted)
   */
  async getForwardDestination(aliasId: string): Promise<string | null> {
    const inbox = await prisma.inbox.findUnique({ where: { id: aliasId } });
    if (!inbox) return null;

    const flags = inbox.flags as any;
    if (!flags?.forwardTo) return null;

    try {
      return decrypt(flags.forwardTo);
    } catch {
      return null;
    }
  },

  /**
   * Delete alias (soft delete)
   */
  async delete(aliasId: string, userId: string): Promise<boolean> {
    const result = await prisma.inbox.updateMany({
      where: {
        id: aliasId,
        ownerId: userId,
        flags: { path: ['isAlias'], equals: true },
      },
      data: { deletedAt: new Date() },
    });

    return result.count > 0;
  },

  /**
   * Get alias stats for user
   */
  async getStats(userId: string): Promise<{ total: number; active: number; totalForwards: number; totalReplies: number }> {
    const aliases = await this.listByUser(userId);

    return {
      total: aliases.length,
      active: aliases.filter(a => a.isActive).length,
      totalForwards: aliases.reduce((sum, a) => sum + a.forwardCount, 0),
      totalReplies: aliases.reduce((sum, a) => sum + a.replyCount, 0),
    };
  },

  /**
   * Format inbox as Alias
   */
  formatAlias(inbox: any): Alias {
    const flags = inbox.flags as any || {};
    let forwardTo = '';

    try {
      if (flags.forwardTo) {
        forwardTo = decrypt(flags.forwardTo);
      }
    } catch {
      forwardTo = '[encrypted]';
    }

    return {
      id: inbox.id,
      email: `${inbox.localPart}@${inbox.domain.name}`,
      localPart: inbox.localPart,
      domain: inbox.domain.name,
      forwardTo,
      isActive: flags.isActive ?? true,
      forwardCount: flags.forwardCount || 0,
      replyCount: flags.replyCount || 0,
      createdAt: inbox.createdAt,
      lastUsedAt: inbox.claimedAt,
    };
  },
};
