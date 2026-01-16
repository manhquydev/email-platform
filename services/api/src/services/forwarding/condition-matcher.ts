/**
 * Condition Matcher for Forwarding Rules
 * Evaluates message against forwarding conditions
 */

import type { Message } from "@prisma/client";
import { extractOTP } from "../../utils/otpExtractor";

export interface ForwardCondition {
  field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HEADER' | 'HAS_ATTACHMENT';
  operator: 'EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' |
            'ENDS_WITH' | 'REGEX' | 'CONTAINS_OTP' | 'EXISTS';
  value: string | null;
  headerName?: string;
  caseSensitive?: boolean;
}

export type MatchType = 'ALL' | 'ANY';

/**
 * Evaluate a single condition against a message
 */
function evaluateCondition(
  message: Message & { attachments?: { id: string }[] },
  condition: ForwardCondition
): boolean {
  const { field, operator, value, headerName, caseSensitive = false } = condition;

  // Get field value from message
  let fieldValue: string | null = null;

  switch (field) {
    case 'FROM':
      fieldValue = message.fromAddress;
      break;
    case 'TO':
      fieldValue = message.toAddress;
      break;
    case 'SUBJECT':
      fieldValue = message.subject;
      break;
    case 'BODY':
      fieldValue = message.textBody || message.htmlBody;
      break;
    case 'HEADER':
      if (headerName && message.headers) {
        const headers = message.headers as Record<string, string>;
        fieldValue = headers[headerName] || null;
      }
      break;
    case 'HAS_ATTACHMENT':
      // Special case: check attachment existence
      const hasAttachment = (message.attachments?.length || 0) > 0;
      return operator === 'EXISTS' ? hasAttachment : !hasAttachment;
  }

  // Handle null field value
  if (fieldValue === null) {
    return operator === 'EXISTS' ? false : false;
  }

  // Normalize for case-insensitive comparison
  const normalizedField = caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const normalizedValue = value && !caseSensitive ? value.toLowerCase() : value;

  // Evaluate operator
  switch (operator) {
    case 'EQUALS':
      return normalizedField === normalizedValue;

    case 'CONTAINS':
      return normalizedValue ? normalizedField.includes(normalizedValue) : false;

    case 'NOT_CONTAINS':
      return normalizedValue ? !normalizedField.includes(normalizedValue) : true;

    case 'STARTS_WITH':
      return normalizedValue ? normalizedField.startsWith(normalizedValue) : false;

    case 'ENDS_WITH':
      return normalizedValue ? normalizedField.endsWith(normalizedValue) : false;

    case 'REGEX':
      if (!value) return false;
      try {
        const regex = new RegExp(value, caseSensitive ? '' : 'i');
        return regex.test(fieldValue);
      } catch {
        return false;
      }

    case 'CONTAINS_OTP':
      return extractOTP(fieldValue) !== null;

    case 'EXISTS':
      return fieldValue !== null && fieldValue.length > 0;

    default:
      return false;
  }
}

/**
 * Check if message matches all conditions based on matchType
 */
export function matchesConditions(
  message: Message & { attachments?: { id: string }[] },
  conditions: ForwardCondition[],
  matchType: MatchType = 'ALL'
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions = match all
  }

  if (matchType === 'ALL') {
    return conditions.every(c => evaluateCondition(message, c));
  } else {
    return conditions.some(c => evaluateCondition(message, c));
  }
}

/**
 * Parse legacy conditions format to new format
 */
export function parseLegacyConditions(legacy: any): ForwardCondition[] {
  if (!legacy || typeof legacy !== 'object') return [];

  const conditions: ForwardCondition[] = [];

  if (legacy.senderDomains?.length > 0) {
    legacy.senderDomains.forEach((domain: string) => {
      conditions.push({
        field: 'FROM',
        operator: 'ENDS_WITH',
        value: `@${domain}`
      });
    });
  }

  if (legacy.containsOTP) {
    conditions.push({
      field: 'BODY',
      operator: 'CONTAINS_OTP',
      value: null
    });
  }

  if (legacy.subjectContains) {
    conditions.push({
      field: 'SUBJECT',
      operator: 'CONTAINS',
      value: legacy.subjectContains
    });
  }

  return conditions;
}
