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

type UpdateRulePayload = Partial<CreateRulePayload>;

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
  FROM: 'Người gửi',
  TO: 'Người nhận',
  SUBJECT: 'Tiêu đề',
  BODY: 'Nội dung',
  HEADER: 'Tiêu đề thư',
  SIZE: 'Kích thước (bytes)',
  SPAM_SCORE: 'Điểm spam',
  HAS_ATTACHMENT: 'Có tệp đính kèm',
};

// Operator display labels
export const OPERATOR_LABELS: Record<string, string> = {
  EQUALS: 'Bằng',
  CONTAINS: 'Chứa',
  STARTS_WITH: 'Bắt đầu bằng',
  ENDS_WITH: 'Kết thúc bằng',
  REGEX: 'Khớp Regex',
  IN: 'Trong danh sách',
  GT: 'Lớn hơn',
  LT: 'Nhỏ hơn',
};

// Rule type display info
export const RULE_TYPE_INFO: Record<VisibilityRuleType, { label: string; color: string; icon: string }> = {
  HIDE: { label: 'Ẩn', color: 'red', icon: '🚫' },
  SHOW_ONLY: { label: 'Chỉ hiển thị', color: 'green', icon: '✅' },
  WARN: { label: 'Cảnh báo', color: 'yellow', icon: '⚠️' },
  REDACT: { label: 'Che giấu', color: 'purple', icon: '🔒' },
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
