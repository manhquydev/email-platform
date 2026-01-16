import { describe, it, expect } from 'vitest';
import { matchesConditions, parseLegacyConditions, type ForwardCondition } from '../../services/forwarding/condition-matcher';

describe('Condition Matcher', () => {
  const mockMessage = {
    fromAddress: 'sender@example.com',
    toAddress: 'recipient@test.com',
    subject: 'Your verification code is 123456',
    textBody: 'Please use code 789012 to verify your account.',
    htmlBody: '<p>Your OTP is <b>654321</b></p>',
    headers: { 'X-Custom': 'test-value' } as Record<string, string>,
  };

  describe('matchesConditions', () => {
    it('should match FROM condition with CONTAINS', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'CONTAINS', value: 'example.com' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match FROM condition with EQUALS', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'EQUALS', value: 'sender@example.com' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match SUBJECT with CONTAINS', () => {
      const conditions: ForwardCondition[] = [
        { field: 'SUBJECT', operator: 'CONTAINS', value: 'verification' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match BODY with CONTAINS_OTP', () => {
      const conditions: ForwardCondition[] = [
        { field: 'BODY', operator: 'CONTAINS_OTP', value: null }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match multiple conditions with ALL mode', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'CONTAINS', value: 'example' },
        { field: 'SUBJECT', operator: 'CONTAINS', value: 'verification' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should fail ALL mode when one condition fails', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'CONTAINS', value: 'example' },
        { field: 'SUBJECT', operator: 'CONTAINS', value: 'nonexistent' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(false);
    });

    it('should pass ANY mode when one condition passes', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'CONTAINS', value: 'nonexistent' },
        { field: 'SUBJECT', operator: 'CONTAINS', value: 'verification' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ANY')).toBe(true);
    });

    it('should match NOT_CONTAINS', () => {
      const conditions: ForwardCondition[] = [
        { field: 'SUBJECT', operator: 'NOT_CONTAINS', value: 'spam' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match STARTS_WITH', () => {
      const conditions: ForwardCondition[] = [
        { field: 'SUBJECT', operator: 'STARTS_WITH', value: 'Your' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match ENDS_WITH', () => {
      const conditions: ForwardCondition[] = [
        { field: 'FROM', operator: 'ENDS_WITH', value: '.com' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should match REGEX', () => {
      const conditions: ForwardCondition[] = [
        { field: 'SUBJECT', operator: 'REGEX', value: '\\d{6}' }
      ];
      expect(matchesConditions(mockMessage, conditions, 'ALL')).toBe(true);
    });

    it('should return true for empty conditions', () => {
      expect(matchesConditions(mockMessage, [], 'ALL')).toBe(true);
    });
  });

  describe('parseLegacyConditions', () => {
    it('should parse senderDomains', () => {
      const legacy = { senderDomains: ['example.com', 'test.org'] };
      const conditions = parseLegacyConditions(legacy);
      expect(conditions).toHaveLength(2);
      expect(conditions[0]).toEqual({ field: 'FROM', operator: 'ENDS_WITH', value: '@example.com' });
    });

    it('should parse subjectContains', () => {
      const legacy = { subjectContains: 'OTP' };
      const conditions = parseLegacyConditions(legacy);
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toEqual({ field: 'SUBJECT', operator: 'CONTAINS', value: 'OTP' });
    });

    it('should parse containsOTP', () => {
      const legacy = { containsOTP: true };
      const conditions = parseLegacyConditions(legacy);
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toEqual({ field: 'BODY', operator: 'CONTAINS_OTP', value: null });
    });

    it('should combine multiple legacy conditions', () => {
      const legacy = {
        senderDomains: ['bank.com'],
        subjectContains: 'verification',
        containsOTP: true
      };
      const conditions = parseLegacyConditions(legacy);
      expect(conditions).toHaveLength(3);
    });
  });
});
