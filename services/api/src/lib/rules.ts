import { RuleScope, RuleType } from "@prisma/client";
import { prisma } from "./prisma";

export type RuleCheckInput = {
  senderDomain?: string;
  senderEmail?: string;
  recipientDomain?: string;
  recipientInbox?: string;
  sourceIp?: string;
};

export type RuleMatch =
  | { action: "ALLOW"; rule?: { id: string; scope: string; value: string } }
  | { action: "BLOCK"; rule: { id: string; scope: string; value: string } };

export const evaluateRules = async (input: RuleCheckInput): Promise<RuleMatch> => {
  const normalize = (value?: string) => value?.toLowerCase().trim();

  const senderDomain = normalize(input.senderDomain);
  const senderEmail = normalize(input.senderEmail);
  const recipientDomain = normalize(input.recipientDomain);
  const recipientInbox = normalize(input.recipientInbox);
  const sourceIp = normalize(input.sourceIp);

  const filters = [];
  if (senderDomain) filters.push({ scope: RuleScope.SENDER_DOMAIN, value: senderDomain });
  if (senderEmail) filters.push({ scope: RuleScope.SENDER_EMAIL, value: senderEmail });
  if (recipientDomain) filters.push({ scope: RuleScope.RECIPIENT_DOMAIN, value: recipientDomain });
  if (recipientInbox) filters.push({ scope: RuleScope.RECIPIENT_INBOX, value: recipientInbox });
  if (sourceIp) filters.push({ scope: RuleScope.SOURCE_IP, value: sourceIp });

  if (!filters.length) return { action: "ALLOW" };

  const now = new Date();
  const rules = await prisma.rule.findMany({
    where: {
      OR: filters,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
  });

  const allow = rules.find((r) => r.type === RuleType.ALLOW);
  if (allow) {
    return { action: "ALLOW", rule: { id: allow.id, scope: allow.scope, value: allow.value } };
  }
  const block = rules.find((r) => r.type === RuleType.BLOCK);
  if (block) {
    return { action: "BLOCK", rule: { id: block.id, scope: block.scope, value: block.value } };
  }
  return { action: "ALLOW" };
};
