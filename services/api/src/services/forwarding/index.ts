/**
 * Main Forwarding Service
 * Orchestrates forwarding rule evaluation and execution
 */

import { prisma } from "../../lib/prisma";
import { matchesConditions, parseLegacyConditions, type ForwardCondition } from "./condition-matcher";
import { forwardToEmail, forwardToTelegram, forwardToDiscord, forwardToWebhook } from "./destinations";
import type { Message, ForwardingRule, FilterMatchType } from "@prisma/client";

type MessageWithRelations = Message & {
  inbox: { id: string; ownerId: string | null };
  attachments?: { id: string; filename: string }[];
};

interface ForwardResult {
  success: boolean;
  error?: string;
}

/**
 * Process forwarding rules for a new message
 */
export async function processForwardingRules(message: MessageWithRelations): Promise<void> {
  if (!message.inbox.ownerId) return;

  // Get active rules for this user, sorted by priority (higher first)
  const rules = await prisma.forwardingRule.findMany({
    where: {
      userId: message.inbox.ownerId,
      isActive: true,
      OR: [
        { inboxId: null }, // Rules applying to all inboxes
        { inboxId: message.inbox.id }, // Rules specific to this inbox
      ],
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    await processRule(message, rule);
  }
}

/**
 * Process a single forwarding rule
 */
async function processRule(
  message: MessageWithRelations,
  rule: ForwardingRule
): Promise<void> {
  const startTime = Date.now();

  // Parse conditions (handle legacy format)
  let conditions: ForwardCondition[];
  const rawConditions = rule.conditions as any;

  if (Array.isArray(rawConditions)) {
    conditions = rawConditions;
  } else {
    conditions = parseLegacyConditions(rawConditions);
  }

  // Check if message matches conditions
  const matchType = ((rule as any).matchType || "ALL") as FilterMatchType;
  if (!matchesConditions(message, conditions, matchType)) {
    return; // Message doesn't match, skip this rule
  }

  // Execute forward based on destination type
  const destinationType = (rule as any).destinationType || "EMAIL";
  let result: ForwardResult;
  let destination: string;

  switch (destinationType) {
    case "EMAIL":
      destination = rule.forwardTo || "";
      result = await forwardToEmail(message, rule);
      break;

    case "TELEGRAM":
      destination = `telegram:${(rule as any).telegramChatId}`;
      result = await forwardToTelegram(message, rule);
      break;

    case "DISCORD":
      destination = "discord:webhook";
      result = await forwardToDiscord(message, rule);
      break;

    case "WEBHOOK":
      destination = (rule as any).webhookUrl || "";
      result = await forwardToWebhook(message, rule);
      break;

    default:
      result = { success: false, error: "Unknown destination type" };
      destination = "unknown";
  }

  const duration = Date.now() - startTime;

  // Log the execution
  await prisma.forwardingLog.create({
    data: {
      ruleId: rule.id,
      messageId: message.id,
      status: result.success ? "SUCCESS" : "FAILED",
      destination,
      destinationType,
      duration,
      error: result.error,
    },
  });

  // Update rule stats on success
  if (result.success) {
    await prisma.forwardingRule.update({
      where: { id: rule.id },
      data: {
        forwardCount: { increment: 1 },
        lastForwardAt: new Date(),
      },
    });
  }

  // Log result (using structured logging would be better in production)
  if (!result.success) {
    // Only log errors, not successes to reduce noise
    console.error(
      `[Forwarding] Rule ${rule.id}: FAILED -> ${destination}`,
      `Error: ${result.error}`
    );
  }
}

/**
 * Get forwarding stats for a user
 */
export async function getForwardingStats(userId: string) {
  const [totalRules, activeRules, totalForwards, recentLogs] = await Promise.all([
    prisma.forwardingRule.count({ where: { userId } }),
    prisma.forwardingRule.count({ where: { userId, isActive: true } }),
    prisma.forwardingRule.aggregate({
      where: { userId },
      _sum: { forwardCount: true },
    }),
    prisma.forwardingLog.findMany({
      where: { rule: { userId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        rule: { select: { name: true } },
      },
    }),
  ]);

  return {
    totalRules,
    activeRules,
    totalForwards: totalForwards._sum.forwardCount || 0,
    recentLogs,
  };
}
