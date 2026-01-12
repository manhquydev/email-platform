/**
 * Visibility Engine Service
 * Evaluates visibility rules for public inbox viewing
 */

import { prisma } from '../lib/prisma';
import type { VisibilityRule, VisibilityRuleType, FilterMatchType } from '@prisma/client';

// HTML entity decode map for common entities
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&apos;': "'", '&#39;': "'",
  '&aacute;': 'á', '&agrave;': 'à', '&atilde;': 'ã', '&acirc;': 'â',
  '&eacute;': 'é', '&egrave;': 'è', '&etilde;': 'ẽ', '&ecirc;': 'ê',
  '&iacute;': 'í', '&igrave;': 'ì', '&itilde;': 'ĩ',
  '&oacute;': 'ó', '&ograve;': 'ò', '&otilde;': 'õ', '&ocirc;': 'ô',
  '&uacute;': 'ú', '&ugrave;': 'ù', '&utilde;': 'ũ',
  '&yacute;': 'ý', '&ygrave;': 'ỳ',
};

/**
 * Strip HTML tags and decode common entities from HTML content
 */
function stripHtmlForSearch(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode numeric HTML entities (&#xxx; or &#xXXX;)
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Decode named HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// Condition structure matching schema.prisma Json field
export interface VisibilityCondition {
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'SIZE' | 'SPAM_SCORE' | 'HAS_ATTACHMENT';
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'IN' | 'GT' | 'LT';
  value: string;
  negate?: boolean;
  caseSensitive?: boolean;
  headerName?: string; // For HEADER field
}

export interface EmailData {
  fromAddress?: string | null;
  toAddress?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  headers?: Record<string, string> | null;
  size?: number | null;
  spamScore?: number | null;
  hasAttachment: boolean;
}

export type VisibilityAction = 'SHOWN' | 'HIDDEN' | 'WARNED' | 'REDACTED';

export interface VisibilityResult {
  action: VisibilityAction;
  ruleId?: string;
  ruleName?: string;
  reason?: string;
}

// In-memory cache for rules per inbox
const rulesCache = new Map<string, { rules: VisibilityRule[]; cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Safe regex execution with timeout protection
 */
function safeRegexTest(pattern: string, text: string, timeoutMs = 100): boolean {
  try {
    // Basic ReDoS prevention: reject overly complex patterns
    if (pattern.length > 200) return false;
    if (/(\.\*){3,}/.test(pattern)) return false; // Multiple .* in sequence
    if (/(\+\+|\*\*|\?\?)/.test(pattern)) return false; // Possessive quantifiers abuse

    const regex = new RegExp(pattern, 'i');
    const start = Date.now();
    const result = regex.test(text);

    // Log if took too long (for monitoring)
    if (Date.now() - start > timeoutMs) {
      console.warn(`[VisibilityEngine] Slow regex: ${pattern.slice(0, 50)}...`);
    }
    return result;
  } catch {
    return false;
  }
}

/**
 * Get field value from email data
 */
function getFieldValue(condition: VisibilityCondition, email: EmailData): string | number | boolean {
  switch (condition.field) {
    case 'FROM':
      return email.fromAddress || '';
    case 'TO':
      return email.toAddress || '';
    case 'SUBJECT':
      return email.subject || '';
    case 'BODY':
      // Skip large bodies for performance
      if (email.textBody) {
        if (email.textBody.length > 10_000_000) return ''; // 10MB limit
        return email.textBody;
      }
      if (email.htmlBody) {
        if (email.htmlBody.length > 10_000_000) return ''; // 10MB limit
        // Strip HTML tags and decode entities for searchable text
        return stripHtmlForSearch(email.htmlBody);
      }
      return '';
    case 'HEADER':
      if (!condition.headerName || !email.headers) return '';
      return email.headers[condition.headerName] || '';
    case 'SIZE':
      return email.size || 0;
    case 'SPAM_SCORE':
      return email.spamScore || 0;
    case 'HAS_ATTACHMENT':
      return email.hasAttachment;
    default:
      return '';
  }
}

/**
 * Evaluate a single condition against email data
 */
function evaluateCondition(condition: VisibilityCondition, email: EmailData): boolean {
  const fieldValue = getFieldValue(condition, email);
  const compareValue = condition.value;

  // Debug logging
  console.log(`[VisibilityEngine] Evaluating condition: field=${condition.field}, operator=${condition.operator}, value="${compareValue.slice(0, 50)}", fieldValue="${String(fieldValue).slice(0, 100)}"`);

  let result: boolean;

  // Handle boolean field
  if (condition.field === 'HAS_ATTACHMENT') {
    result = fieldValue === (compareValue.toLowerCase() === 'true');
    return condition.negate ? !result : result;
  }

  // Handle numeric fields
  if (condition.field === 'SIZE' || condition.field === 'SPAM_SCORE') {
    const numValue = typeof fieldValue === 'number' ? fieldValue : 0;
    const compareNum = parseFloat(compareValue);
    if (isNaN(compareNum)) {
      result = false;
    } else {
      switch (condition.operator) {
        case 'GT':
          result = numValue > compareNum;
          break;
        case 'LT':
          result = numValue < compareNum;
          break;
        case 'EQUALS':
          result = numValue === compareNum;
          break;
        default:
          result = false;
      }
    }
    return condition.negate ? !result : result;
  }

  // Handle string fields
  const strValue = condition.caseSensitive
    ? String(fieldValue)
    : String(fieldValue).toLowerCase();
  const strCompare = condition.caseSensitive
    ? compareValue
    : compareValue.toLowerCase();

  switch (condition.operator) {
    case 'EQUALS':
      result = strValue === strCompare;
      break;
    case 'CONTAINS':
      result = strValue.includes(strCompare);
      break;
    case 'STARTS_WITH':
      result = strValue.startsWith(strCompare);
      break;
    case 'ENDS_WITH':
      result = strValue.endsWith(strCompare);
      break;
    case 'REGEX':
      result = safeRegexTest(compareValue, String(fieldValue));
      break;
    case 'IN':
      // Value is comma-separated list
      const list = compareValue.split(',').map(s =>
        condition.caseSensitive ? s.trim() : s.trim().toLowerCase()
      );
      result = list.includes(strValue);
      break;
    default:
      result = false;
  }

  console.log(`[VisibilityEngine] Condition result: ${result}, negate: ${condition.negate}, final: ${condition.negate ? !result : result}`);
  return condition.negate ? !result : result;
}

/**
 * Evaluate all conditions for a rule
 */
function evaluateConditions(
  conditions: VisibilityCondition[],
  email: EmailData,
  matchType: FilterMatchType
): boolean {
  if (conditions.length === 0) return true;

  if (matchType === 'ALL') {
    return conditions.every(c => evaluateCondition(c, email));
  } else {
    return conditions.some(c => evaluateCondition(c, email));
  }
}

/**
 * Get rules for an inbox (with caching)
 */
export async function getRulesForInbox(inboxId: string): Promise<VisibilityRule[]> {
  const cached = rulesCache.get(inboxId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  const rules = await prisma.visibilityRule.findMany({
    where: { inboxId, isEnabled: true },
    orderBy: { priority: 'desc' },
  });

  rulesCache.set(inboxId, { rules, cachedAt: Date.now() });
  return rules;
}

/**
 * Invalidate cache for an inbox (call on rule CRUD)
 */
export function invalidateRulesCache(inboxId: string): void {
  rulesCache.delete(inboxId);
}

/**
 * Evaluate a message against visibility rules
 * Returns the visibility action to apply
 */
export async function evaluateMessage(
  inboxId: string,
  email: EmailData
): Promise<VisibilityResult> {
  const rules = await getRulesForInbox(inboxId);

  console.log(`[VisibilityEngine] Evaluating message: from="${email.fromAddress}", subject="${email.subject?.slice(0, 50)}", rules=${rules.length}`);
  console.log(`[VisibilityEngine] Email body preview: textBody=${email.textBody?.slice(0, 100) || 'null'}, htmlBody=${email.htmlBody?.slice(0, 100) || 'null'}`);

  if (rules.length === 0) {
    return { action: 'SHOWN' };
  }

  // Separate rules by type for proper execution order
  const hideRules = rules.filter(r => r.ruleType === 'HIDE');
  const showOnlyRules = rules.filter(r => r.ruleType === 'SHOW_ONLY');
  const warnRules = rules.filter(r => r.ruleType === 'WARN');
  const redactRules = rules.filter(r => r.ruleType === 'REDACT');

  console.log(`[VisibilityEngine] Rules by type: HIDE=${hideRules.length}, SHOW_ONLY=${showOnlyRules.length}, WARN=${warnRules.length}, REDACT=${redactRules.length}`);

  // 1. Check HIDE rules first (highest priority category)
  for (const rule of hideRules) {
    const conditions = rule.conditions as unknown as VisibilityCondition[];
    if (evaluateConditions(conditions, email, rule.matchType)) {
      return {
        action: 'HIDDEN',
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `Matched HIDE rule: ${rule.name}`,
      };
    }
  }

  // 2. Check SHOW_ONLY rules (whitelist mode)
  // If any SHOW_ONLY rules exist and none match -> HIDDEN
  if (showOnlyRules.length > 0) {
    const matchesAnyShowOnly = showOnlyRules.some(rule => {
      const conditions = rule.conditions as unknown as VisibilityCondition[];
      console.log(`[VisibilityEngine] Checking SHOW_ONLY rule: "${rule.name}", conditions=${JSON.stringify(conditions)}`);
      const matches = evaluateConditions(conditions, email, rule.matchType);
      console.log(`[VisibilityEngine] SHOW_ONLY rule "${rule.name}" matches: ${matches}`);
      return matches;
    });

    console.log(`[VisibilityEngine] SHOW_ONLY final result: matchesAny=${matchesAnyShowOnly}`);
    if (!matchesAnyShowOnly) {
      return {
        action: 'HIDDEN',
        reason: 'Did not match any SHOW_ONLY rules',
      };
    }
  }

  // 3. Check REDACT rules
  for (const rule of redactRules) {
    const conditions = rule.conditions as unknown as VisibilityCondition[];
    if (evaluateConditions(conditions, email, rule.matchType)) {
      return {
        action: 'REDACTED',
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `Matched REDACT rule: ${rule.name}`,
      };
    }
  }

  // 4. Check WARN rules
  for (const rule of warnRules) {
    const conditions = rule.conditions as unknown as VisibilityCondition[];
    if (evaluateConditions(conditions, email, rule.matchType)) {
      return {
        action: 'WARNED',
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `Matched WARN rule: ${rule.name}`,
      };
    }
  }

  // Default: show the message
  return { action: 'SHOWN' };
}

/**
 * Batch evaluate multiple messages
 */
export async function evaluateMessages(
  inboxId: string,
  emails: Array<{ id: string; data: EmailData }>
): Promise<Map<string, VisibilityResult>> {
  const results = new Map<string, VisibilityResult>();

  // Pre-fetch rules once
  const rules = await getRulesForInbox(inboxId);

  for (const { id, data } of emails) {
    if (rules.length === 0) {
      results.set(id, { action: 'SHOWN' });
      continue;
    }

    // Inline evaluation to avoid repeated cache checks
    const hideRules = rules.filter(r => r.ruleType === 'HIDE');
    const showOnlyRules = rules.filter(r => r.ruleType === 'SHOW_ONLY');
    const warnRules = rules.filter(r => r.ruleType === 'WARN');
    const redactRules = rules.filter(r => r.ruleType === 'REDACT');

    let result: VisibilityResult = { action: 'SHOWN' };

    // Check HIDE
    for (const rule of hideRules) {
      const conditions = rule.conditions as unknown as VisibilityCondition[];
      if (evaluateConditions(conditions, data, rule.matchType)) {
        result = { action: 'HIDDEN', ruleId: rule.id, ruleName: rule.name };
        break;
      }
    }

    if (result.action === 'SHOWN' && showOnlyRules.length > 0) {
      const matchesAny = showOnlyRules.some(rule => {
        const conditions = rule.conditions as unknown as VisibilityCondition[];
        return evaluateConditions(conditions, data, rule.matchType);
      });
      if (!matchesAny) {
        result = { action: 'HIDDEN', reason: 'No SHOW_ONLY match' };
      }
    }

    if (result.action === 'SHOWN') {
      for (const rule of redactRules) {
        const conditions = rule.conditions as unknown as VisibilityCondition[];
        if (evaluateConditions(conditions, data, rule.matchType)) {
          result = { action: 'REDACTED', ruleId: rule.id, ruleName: rule.name };
          break;
        }
      }
    }

    if (result.action === 'SHOWN') {
      for (const rule of warnRules) {
        const conditions = rule.conditions as unknown as VisibilityCondition[];
        if (evaluateConditions(conditions, data, rule.matchType)) {
          result = { action: 'WARNED', ruleId: rule.id, ruleName: rule.name };
          break;
        }
      }
    }

    results.set(id, result);
  }

  return results;
}

/**
 * Redact sensitive fields from a message
 */
export function redactMessage<T extends { subject?: string | null; textBody?: string | null; htmlBody?: string | null }>(
  message: T
): T {
  return {
    ...message,
    subject: message.subject ? '[REDACTED]' : null,
    textBody: message.textBody ? '[REDACTED]' : null,
    htmlBody: message.htmlBody ? '<p>[REDACTED]</p>' : null,
  };
}

/**
 * Log visibility audit entry
 */
export async function logVisibilityAudit(
  inboxId: string,
  messageId: string,
  result: VisibilityResult,
  requestedBy?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.messageVisibilityAudit.create({
      data: {
        inboxId,
        messageId,
        action: result.action,
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        reason: result.reason,
        requestedBy,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[VisibilityEngine] Failed to log audit:', error);
  }
}
