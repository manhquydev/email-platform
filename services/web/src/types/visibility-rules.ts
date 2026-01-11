/**
 * Visibility Rules Types
 */

export type VisibilityRuleType = 'HIDE' | 'SHOW_ONLY' | 'WARN' | 'REDACT';
export type VisibilityMatchType = 'ALL' | 'ANY';
export type VisibilityConditionField = 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'SIZE' | 'SPAM_SCORE' | 'HAS_ATTACHMENT';
export type VisibilityConditionOperator = 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'IN' | 'GT' | 'LT';

export interface VisibilityCondition {
  field: VisibilityConditionField;
  operator: VisibilityConditionOperator;
  value: string;
  negate?: boolean;
  caseSensitive?: boolean;
  headerName?: string;
}

export interface VisibilityRule {
  id: string;
  inboxId: string;
  name: string;
  description?: string;
  ruleType: VisibilityRuleType;
  matchType: VisibilityMatchType;
  conditions: VisibilityCondition[];
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisibilityRuleTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  ruleType: VisibilityRuleType;
  matchType: VisibilityMatchType;
  conditions: VisibilityCondition[];
  isSystem: boolean;
  createdAt: string;
}

export interface VisibilityTestResult {
  messageId: string;
  subject: string | null;
  fromAddress: string | null;
  receivedAt: string;
  action: 'SHOWN' | 'HIDDEN' | 'WARNED' | 'REDACTED';
  matchedRule?: { id: string; name: string };
  reason?: string;
}

export interface VisibilityTestSummary {
  total: number;
  shown: number;
  hidden: number;
  warned: number;
  redacted: number;
}
