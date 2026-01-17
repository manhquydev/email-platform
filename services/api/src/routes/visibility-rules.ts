/**
 * Visibility Rules Routes
 * CRUD operations for message visibility rules (owner-only)
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { recordAudit } from '../utils/audit';
import { invalidateRulesCache } from '../services/visibility-engine';

const MAX_RULES_PER_INBOX = 50;

// Validation schemas
const conditionSchema = z.object({
  field: z.enum(['FROM', 'TO', 'SUBJECT', 'BODY', 'HEADER', 'SIZE', 'SPAM_SCORE', 'HAS_ATTACHMENT']),
  operator: z.enum(['EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'IN', 'GT', 'LT']),
  value: z.string().min(1).max(1000),
  negate: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  headerName: z.string().max(100).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ruleType: z.enum(['HIDE', 'SHOW_ONLY', 'WARN', 'REDACT']),
  matchType: z.enum(['ALL', 'ANY']).default('ALL'),
  conditions: z.array(conditionSchema).min(1).max(20),
  priority: z.number().int().min(0).max(100).default(50),
  isEnabled: z.boolean().default(true),
});

const updateRuleSchema = createRuleSchema.partial().omit({});

const reorderSchema = z.object({
  ruleIds: z.array(z.string().uuid()),
});

const testRulesSchema = z.object({
  messageIds: z.array(z.string().uuid()).max(50).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
});

/**
 * Verify inbox ownership
 */
async function verifyInboxOwnership(inboxId: string, userId: string): Promise<boolean> {
  const inbox = await prisma.inbox.findFirst({
    where: { id: inboxId, ownerId: userId, deletedAt: null },
  });
  return !!inbox;
}

/**
 * Verify rule ownership (via inbox)
 */
async function verifyRuleOwnership(ruleId: string, userId: string): Promise<{ rule: any; inbox: any } | null> {
  const rule = await prisma.visibilityRule.findFirst({
    where: { id: ruleId },
    include: { inbox: true },
  });
  if (!rule || rule.inbox.ownerId !== userId || rule.inbox.deletedAt) {
    return null;
  }
  return { rule, inbox: rule.inbox };
}

export const visibilityRulesRoutes: FastifyPluginAsync = async (app) => {
  // ==================
  // VISIBILITY RULES CRUD
  // ==================

  /**
   * GET /inboxes/:inboxId/visibility-rules
   * List all visibility rules for an inbox
   */
  app.get('/inboxes/:inboxId/visibility-rules', { preHandler: app.authenticate }, async (req, reply) => {
    const { inboxId } = req.params as { inboxId: string };
    const user = req.user as { userId: string };

    if (!await verifyInboxOwnership(inboxId, user.userId)) {
      return reply.status(403).send({ error: 'Not authorized to access this inbox' });
    }

    const rules = await prisma.visibilityRule.findMany({
      where: { inboxId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return { rules };
  });

  /**
   * POST /inboxes/:inboxId/visibility-rules
   * Create a new visibility rule
   */
  app.post('/inboxes/:inboxId/visibility-rules', { preHandler: app.authenticate }, async (req, reply) => {
    const { inboxId } = req.params as { inboxId: string };
    const user = req.user as { userId: string };

    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    if (!await verifyInboxOwnership(inboxId, user.userId)) {
      return reply.status(403).send({ error: 'Not authorized to access this inbox' });
    }

    // Check rule limit
    const ruleCount = await prisma.visibilityRule.count({ where: { inboxId } });
    if (ruleCount >= MAX_RULES_PER_INBOX) {
      return reply.status(400).send({
        error: 'Rule limit exceeded',
        message: `Maximum ${MAX_RULES_PER_INBOX} rules per inbox allowed`,
      });
    }

    // Validate regex patterns
    for (const condition of parsed.data.conditions) {
      if (condition.operator === 'REGEX') {
        try {
          new RegExp(condition.value);
        } catch {
          return reply.status(400).send({
            error: 'Invalid regex pattern',
            message: `Invalid regex in condition: ${condition.value}`,
          });
        }
      }
    }

    const rule = await prisma.visibilityRule.create({
      data: {
        inboxId,
        name: parsed.data.name,
        description: parsed.data.description,
        ruleType: parsed.data.ruleType,
        matchType: parsed.data.matchType,
        conditions: parsed.data.conditions,
        priority: parsed.data.priority,
        isEnabled: parsed.data.isEnabled,
      },
    });

    invalidateRulesCache(inboxId);

    await recordAudit({ userId: user.userId, action: 'VISIBILITY_RULE_CREATED', meta: {
      ruleId: rule.id,
      inboxId,
      ruleName: rule.name,
      ruleType: rule.ruleType,
    });

    return reply.status(201).send({ rule });
  });

  /**
   * PATCH /visibility-rules/:id
   * Update a visibility rule
   */
  app.patch('/visibility-rules/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user as { userId: string };

    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const ownership = await verifyRuleOwnership(id, user.userId);
    if (!ownership) {
      return reply.status(403).send({ error: 'Not authorized to modify this rule' });
    }

    // Validate regex patterns if conditions are being updated
    if (parsed.data.conditions) {
      for (const condition of parsed.data.conditions) {
        if (condition.operator === 'REGEX') {
          try {
            new RegExp(condition.value);
          } catch {
            return reply.status(400).send({
              error: 'Invalid regex pattern',
              message: `Invalid regex in condition: ${condition.value}`,
            });
          }
        }
      }
    }

    const updated = await prisma.visibilityRule.update({
      where: { id },
      data: parsed.data,
    });

    invalidateRulesCache(ownership.inbox.id);

    await recordAudit({ userId: user.userId, action: 'VISIBILITY_RULE_UPDATED', meta: {
      ruleId: id,
      inboxId: ownership.inbox.id,
      changes: Object.keys(parsed.data),
    });

    return { rule: updated };
  });

  /**
   * DELETE /visibility-rules/:id
   * Delete a visibility rule
   */
  app.delete('/visibility-rules/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user as { userId: string };

    const ownership = await verifyRuleOwnership(id, user.userId);
    if (!ownership) {
      return reply.status(403).send({ error: 'Not authorized to delete this rule' });
    }

    await prisma.visibilityRule.delete({ where: { id } });

    invalidateRulesCache(ownership.inbox.id);

    await recordAudit({ userId: user.userId, action: 'VISIBILITY_RULE_DELETED', meta: {
      ruleId: id,
      inboxId: ownership.inbox.id,
      ruleName: ownership.rule.name,
    });

    return { success: true };
  });

  /**
   * PATCH /inboxes/:inboxId/visibility-rules/reorder
   * Reorder rule priorities
   */
  app.patch('/inboxes/:inboxId/visibility-rules/reorder', { preHandler: app.authenticate }, async (req, reply) => {
    const { inboxId } = req.params as { inboxId: string };
    const user = req.user as { userId: string };

    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    if (!await verifyInboxOwnership(inboxId, user.userId)) {
      return reply.status(403).send({ error: 'Not authorized to access this inbox' });
    }

    // Update priorities based on order (first = highest priority)
    const updates = parsed.data.ruleIds.map((ruleId, index) => {
      const priority = 100 - index; // First item gets 100, second gets 99, etc.
      return prisma.visibilityRule.updateMany({
        where: { id: ruleId, inboxId },
        data: { priority },
      });
    });

    await Promise.all(updates);
    invalidateRulesCache(inboxId);

    await recordAudit({ userId: user.userId, action: 'VISIBILITY_RULES_REORDERED', meta: { inboxId } });

    return { success: true };
  });

  // ==================
  // TEMPLATES
  // ==================

  /**
   * GET /visibility-templates
   * List all available templates
   */
  app.get('/visibility-templates', { preHandler: app.authenticate }, async () => {
    const templates = await prisma.visibilityRuleTemplate.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return { templates };
  });

  /**
   * POST /inboxes/:inboxId/visibility-rules/apply-template
   * Apply a template to create a new rule
   */
  app.post('/inboxes/:inboxId/visibility-rules/apply-template', { preHandler: app.authenticate }, async (req, reply) => {
    const { inboxId } = req.params as { inboxId: string };
    const user = req.user as { userId: string };

    const parsed = applyTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    if (!await verifyInboxOwnership(inboxId, user.userId)) {
      return reply.status(403).send({ error: 'Not authorized to access this inbox' });
    }

    const template = await prisma.visibilityRuleTemplate.findUnique({
      where: { id: parsed.data.templateId },
    });

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    // Check rule limit
    const ruleCount = await prisma.visibilityRule.count({ where: { inboxId } });
    if (ruleCount >= MAX_RULES_PER_INBOX) {
      return reply.status(400).send({
        error: 'Rule limit exceeded',
        message: `Maximum ${MAX_RULES_PER_INBOX} rules per inbox allowed`,
      });
    }

    const rule = await prisma.visibilityRule.create({
      data: {
        inboxId,
        name: parsed.data.name || template.name,
        description: template.description,
        ruleType: template.ruleType,
        matchType: template.matchType,
        conditions: template.conditions as any,
        priority: 50,
        isEnabled: true,
      },
    });

    invalidateRulesCache(inboxId);

    await recordAudit({ userId: user.userId, action: 'VISIBILITY_RULE_FROM_TEMPLATE', meta: {
      ruleId: rule.id,
      inboxId,
      templateId: template.id,
      templateName: template.name,
    });

    return reply.status(201).send({ rule });
  });

  // ==================
  // TEST/PREVIEW
  // ==================

  /**
   * POST /inboxes/:inboxId/visibility-rules/test
   * Test rules against messages to preview impact
   */
  app.post('/inboxes/:inboxId/visibility-rules/test', { preHandler: app.authenticate }, async (req, reply) => {
    const { inboxId } = req.params as { inboxId: string };
    const user = req.user as { userId: string };

    const parsed = testRulesSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    if (!await verifyInboxOwnership(inboxId, user.userId)) {
      return reply.status(403).send({ error: 'Not authorized to access this inbox' });
    }

    // Import evaluateMessage dynamically to avoid circular deps
    const { evaluateMessage } = await import('../services/visibility-engine');

    // Get messages to test
    const whereClause: any = { inboxId, deletedAt: null };
    if (parsed.data.messageIds && parsed.data.messageIds.length > 0) {
      whereClause.id = { in: parsed.data.messageIds };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { receivedAt: 'desc' },
      take: parsed.data.limit,
      include: { attachments: { select: { id: true } } },
    });

    // Evaluate each message
    const results = await Promise.all(
      messages.map(async (msg) => {
        const emailData = {
          fromAddress: msg.fromAddress,
          toAddress: msg.toAddress,
          subject: msg.subject,
          textBody: msg.textBody,
          htmlBody: msg.htmlBody,
          headers: msg.headers as Record<string, string> | null,
          size: msg.size,
          spamScore: msg.spamScore,
          hasAttachment: msg.attachments.length > 0,
        };

        const result = await evaluateMessage(inboxId, emailData);

        return {
          messageId: msg.id,
          subject: msg.subject,
          fromAddress: msg.fromAddress,
          receivedAt: msg.receivedAt,
          action: result.action,
          matchedRule: result.ruleId ? { id: result.ruleId, name: result.ruleName } : undefined,
          reason: result.reason,
        };
      })
    );

    // Calculate summary
    const summary = {
      total: results.length,
      shown: results.filter(r => r.action === 'SHOWN').length,
      hidden: results.filter(r => r.action === 'HIDDEN').length,
      warned: results.filter(r => r.action === 'WARNED').length,
      redacted: results.filter(r => r.action === 'REDACTED').length,
    };

    return { results, summary };
  });
};
