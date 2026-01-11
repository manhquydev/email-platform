import { api } from './api';
import type {
  VisibilityRule,
  VisibilityRuleTemplate,
  VisibilityCondition,
  VisibilityRuleType,
  VisibilityMatchType,
  VisibilityTestResult,
  VisibilityTestSummary,
} from '../types/visibility-rules';

// Re-export types
export type {
  VisibilityRule,
  VisibilityRuleTemplate,
  VisibilityCondition,
  VisibilityRuleType,
  VisibilityMatchType,
  VisibilityTestResult,
  VisibilityTestSummary,
};

interface CreateRulePayload {
  name: string;
  description?: string;
  ruleType: VisibilityRuleType;
  matchType: VisibilityMatchType;
  conditions: VisibilityCondition[];
  priority?: number;
  isEnabled?: boolean;
}

interface UpdateRulePayload extends Partial<CreateRulePayload> {}

/**
 * Get all visibility rules for an inbox
 */
export async function getVisibilityRules(
  inboxId: string,
  token: string
): Promise<VisibilityRule[]> {
  const res = await api<{ rules: VisibilityRule[] }>(
    `/inboxes/${inboxId}/visibility-rules`,
    { token }
  );
  return res.rules;
}

/**
 * Create a new visibility rule
 */
export async function createVisibilityRule(
  inboxId: string,
  payload: CreateRulePayload,
  token: string
): Promise<VisibilityRule> {
  const res = await api<{ rule: VisibilityRule }>(
    `/inboxes/${inboxId}/visibility-rules`,
    { method: 'POST', body: payload, token }
  );
  return res.rule;
}

/**
 * Update an existing visibility rule
 */
export async function updateVisibilityRule(
  ruleId: string,
  payload: UpdateRulePayload,
  token: string
): Promise<VisibilityRule> {
  const res = await api<{ rule: VisibilityRule }>(
    `/visibility-rules/${ruleId}`,
    { method: 'PATCH', body: payload, token }
  );
  return res.rule;
}

/**
 * Delete a visibility rule
 */
export async function deleteVisibilityRule(
  ruleId: string,
  token: string
): Promise<void> {
  await api(`/visibility-rules/${ruleId}`, { method: 'DELETE', token });
}

/**
 * Reorder visibility rules by priority
 */
export async function reorderVisibilityRules(
  inboxId: string,
  ruleIds: string[],
  token: string
): Promise<void> {
  await api(`/inboxes/${inboxId}/visibility-rules/reorder`, {
    method: 'PATCH',
    body: { ruleIds },
    token,
  });
}

/**
 * Get all available visibility rule templates
 */
export async function getVisibilityTemplates(
  token: string
): Promise<VisibilityRuleTemplate[]> {
  const res = await api<{ templates: VisibilityRuleTemplate[] }>(
    '/visibility-templates',
    { token }
  );
  return res.templates;
}

/**
 * Apply a template to create a new rule
 */
export async function applyVisibilityTemplate(
  inboxId: string,
  templateId: string,
  name: string | undefined,
  token: string
): Promise<VisibilityRule> {
  const res = await api<{ rule: VisibilityRule }>(
    `/inboxes/${inboxId}/visibility-rules/apply-template`,
    { method: 'POST', body: { templateId, name }, token }
  );
  return res.rule;
}

/**
 * Test visibility rules against messages
 */
export async function testVisibilityRules(
  inboxId: string,
  options: { messageIds?: string[]; limit?: number },
  token: string
): Promise<{ results: VisibilityTestResult[]; summary: VisibilityTestSummary }> {
  return api(`/inboxes/${inboxId}/visibility-rules/test`, {
    method: 'POST',
    body: options,
    token,
  });
}

// Field display labels
export const FIELD_LABELS: Record<string, string> = {
  FROM: 'From (Sender)',
  TO: 'To (Recipient)',
  SUBJECT: 'Subject',
  BODY: 'Body Content',
  HEADER: 'Header',
  SIZE: 'Size (bytes)',
  SPAM_SCORE: 'Spam Score',
  HAS_ATTACHMENT: 'Has Attachment',
};

// Operator display labels
export const OPERATOR_LABELS: Record<string, string> = {
  EQUALS: 'Equals',
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts With',
  ENDS_WITH: 'Ends With',
  REGEX: 'Matches Regex',
  IN: 'In List',
  GT: 'Greater Than',
  LT: 'Less Than',
};

// Rule type display info
export const RULE_TYPE_INFO: Record<VisibilityRuleType, { label: string; color: string; icon: string }> = {
  HIDE: { label: 'Hide', color: 'red', icon: '🚫' },
  SHOW_ONLY: { label: 'Show Only', color: 'green', icon: '✅' },
  WARN: { label: 'Warning', color: 'yellow', icon: '⚠️' },
  REDACT: { label: 'Redact', color: 'purple', icon: '🔒' },
};

// Get valid operators for a field
export function getOperatorsForField(field: string): string[] {
  switch (field) {
    case 'SIZE':
    case 'SPAM_SCORE':
      return ['EQUALS', 'GT', 'LT'];
    case 'HAS_ATTACHMENT':
      return ['EQUALS'];
    default:
      return ['EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'IN'];
  }
}
