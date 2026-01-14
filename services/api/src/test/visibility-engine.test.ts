import { describe, it, expect, vi } from 'vitest';
import {
  evaluateMessage,
  type EmailData,
  type VisibilityCondition,
  invalidateRulesCache
} from '../services/visibility-engine';
import { prisma } from '../lib/prisma';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    visibilityRule: {
      findMany: vi.fn(),
    },
    messageVisibilityAudit: {
      create: vi.fn(),
    }
  },
}));

describe('VisibilityEngine', () => {
  const inboxId = 'test-inbox-id';

  const sampleEmail: EmailData = {
    fromAddress: 'sender@example.com',
    toAddress: 'receiver@example.com',
    subject: 'Important Notification',
    textBody: 'Hello, this is a secret message with code 12345.',
    htmlBody: '<p>Hello, this is a secret message with code 12345.</p>',
    hasAttachment: false,
    size: 1024,
    spamScore: 0.1,
  };

  it('should return SHOWN when no rules exist', async () => {
    vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([]);
    invalidateRulesCache(inboxId);

    const result = await evaluateMessage(inboxId, sampleEmail);
    expect(result.action).toBe('SHOWN');
  });

  describe('HIDE rules', () => {
    it('should hide message if HIDE rule matches (FROM)', async () => {
      const rule = {
        id: 'rule-1',
        name: 'Hide example.com',
        ruleType: 'HIDE',
        matchType: 'ALL',
        isEnabled: true,
        priority: 10,
        conditions: [
          { field: 'FROM', operator: 'CONTAINS', value: 'example.com' }
        ],
      };

      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);

      const result = await evaluateMessage(inboxId, sampleEmail);
      expect(result.action).toBe('HIDDEN');
      expect(result.ruleId).toBe('rule-1');
    });

    it('should hide message if HIDE rule matches (BODY with HTML stripping)', async () => {
      const rule = {
        id: 'rule-2',
        name: 'Hide secrets',
        ruleType: 'HIDE',
        matchType: 'ALL',
        isEnabled: true,
        priority: 10,
        conditions: [
          { field: 'BODY', operator: 'CONTAINS', value: 'secret message' }
        ],
      };

      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);

      // Test with HTML only, it should strip tags and find the text
      const htmlEmail = { ...sampleEmail, textBody: null };
      const result = await evaluateMessage(inboxId, htmlEmail);
      expect(result.action).toBe('HIDDEN');
    });
  });

  describe('SHOW_ONLY rules (Whitelist)', () => {
    it('should show message if it matches SHOW_ONLY rule', async () => {
      const rule = {
        id: 'rule-3',
        name: 'Whitelist internal',
        ruleType: 'SHOW_ONLY',
        matchType: 'ALL',
        isEnabled: true,
        priority: 10,
        conditions: [
          { field: 'FROM', operator: 'ENDS_WITH', value: '@example.com' }
        ],
      };

      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);

      const result = await evaluateMessage(inboxId, sampleEmail);
      expect(result.action).toBe('SHOWN');
    });

    it('should hide message if it does NOT match any SHOW_ONLY rule', async () => {
      const rule = {
        id: 'rule-4',
        name: 'Whitelist specific',
        ruleType: 'SHOW_ONLY',
        matchType: 'ALL',
        isEnabled: true,
        priority: 10,
        conditions: [
          { field: 'FROM', operator: 'EQUALS', value: 'allowed@trusted.com' }
        ],
      };

      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);

      const result = await evaluateMessage(inboxId, sampleEmail);
      expect(result.action).toBe('HIDDEN');
      expect(result.reason).toContain('SHOW_ONLY');
    });
  });

  describe('Condition Operators', () => {
    const testOperator = async (operator: any, value: string, negate = false) => {
      const rule = {
        id: 'rule-op',
        name: 'Test Op',
        ruleType: 'HIDE',
        matchType: 'ALL',
        isEnabled: true,
        priority: 10,
        conditions: [
          { field: 'SUBJECT', operator, value, negate }
        ],
      };
      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);
      return await evaluateMessage(inboxId, sampleEmail);
    };

    it('STARTS_WITH', async () => {
      expect((await testOperator('STARTS_WITH', 'Important')).action).toBe('HIDDEN');
      expect((await testOperator('STARTS_WITH', 'Notification')).action).toBe('SHOWN');
    });

    it('REGEX', async () => {
      expect((await testOperator('REGEX', 'notif.*tion')).action).toBe('HIDDEN');
      expect((await testOperator('REGEX', '^Important$')).action).toBe('SHOWN');
    });

    it('IN', async () => {
      expect((await testOperator('IN', 'Alert, Important Notification, News')).action).toBe('HIDDEN');
      expect((await testOperator('IN', 'Urgent, Error')).action).toBe('SHOWN');
    });

    it('Negation', async () => {
      expect((await testOperator('CONTAINS', 'Notification', true)).action).toBe('SHOWN');
      expect((await testOperator('CONTAINS', 'MissingWord', true)).action).toBe('HIDDEN');
    });
  });

  describe('Numeric Operators', () => {
    it('GT (Greater Than)', async () => {
       const rule = {
        id: 'rule-gt',
        ruleType: 'HIDE',
        matchType: 'ALL',
        isEnabled: true,
        conditions: [{ field: 'SIZE', operator: 'GT', value: '500' }],
      };
      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);
      const result = await evaluateMessage(inboxId, sampleEmail);
      expect(result.action).toBe('HIDDEN');
    });

    it('LT (Less Than)', async () => {
       const rule = {
        id: 'rule-lt',
        ruleType: 'HIDE',
        matchType: 'ALL',
        isEnabled: true,
        conditions: [{ field: 'SPAM_SCORE', operator: 'LT', value: '0.5' }],
      };
      vi.mocked(prisma.visibilityRule.findMany).mockResolvedValueOnce([rule as any]);
      invalidateRulesCache(inboxId);
      const result = await evaluateMessage(inboxId, sampleEmail);
      expect(result.action).toBe('HIDDEN');
    });
  });
});
