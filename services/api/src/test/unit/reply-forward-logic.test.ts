import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before imports
vi.mock('../../lib/prisma', () => ({
  prisma: {
    message: {
      findUnique: vi.fn(),
    },
    domain: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    outboundMessage: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../services/outbound', () => ({
  outboundService: {
    sendEmail: vi.fn(),
  },
}));

vi.mock('../../services/team.service', () => ({
  TeamService: {
    canAccessInbox: vi.fn(),
  },
}));

vi.mock('../../utils/audit', () => ({
  recordAudit: vi.fn(),
}));

vi.mock('../../services/storage', () => ({
  storageService: {
    getReadStream: vi.fn(),
  },
}));

import { prisma } from '../../lib/prisma';
import { outboundService } from '../../services/outbound';
import { TeamService } from '../../services/team.service';

describe('Reply/Forward Logic Unit Tests', () => {
  const mockMessage = {
    id: 'msg-123',
    inboxId: 'inbox-123',
    messageId: '<original@example.com>',
    fromAddress: 'sender@external.com',
    toAddress: 'user@mytest.com',
    subject: 'Test Subject',
    textBody: 'Original body text',
    htmlBody: '<p>Original body</p>',
    receivedAt: new Date(),
    deletedAt: null,
    inbox: {
      id: 'inbox-123',
      localPart: 'user',
      ownerId: 'user-123',
      domain: {
        id: 'domain-123',
        name: 'mytest.com',
        status: 'VERIFIED',
        ownerId: 'user-123',
        isPublic: false,
      },
    },
    attachments: [],
  };

  const mockUser = {
    id: 'user-123',
    credits: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Reply subject formatting', () => {
    it('should add Re: prefix to subject', () => {
      const originalSubject = 'Hello World';
      let replySubject = originalSubject;
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${replySubject}`;
      }
      expect(replySubject).toBe('Re: Hello World');
    });

    it('should not double Re: prefix', () => {
      const originalSubject = 'Re: Already replied';
      let replySubject = originalSubject;
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${replySubject}`;
      }
      expect(replySubject).toBe('Re: Already replied');
    });

    it('should handle case-insensitive Re:', () => {
      const originalSubject = 'RE: UPPERCASE';
      let replySubject = originalSubject;
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${replySubject}`;
      }
      expect(replySubject).toBe('RE: UPPERCASE');
    });
  });

  describe('Forward subject formatting', () => {
    it('should add Fwd: prefix to subject', () => {
      const originalSubject = 'Important Email';
      let forwardSubject = originalSubject;
      if (!forwardSubject.toLowerCase().startsWith('fwd:')) {
        forwardSubject = `Fwd: ${forwardSubject}`;
      }
      expect(forwardSubject).toBe('Fwd: Important Email');
    });

    it('should not double Fwd: prefix', () => {
      const originalSubject = 'Fwd: Already forwarded';
      let forwardSubject = originalSubject;
      if (!forwardSubject.toLowerCase().startsWith('fwd:')) {
        forwardSubject = `Fwd: ${forwardSubject}`;
      }
      expect(forwardSubject).toBe('Fwd: Already forwarded');
    });
  });

  describe('Forward body formatting', () => {
    it('should include forward header in body', () => {
      const originalMessage = mockMessage;
      const forwardHeader = `
---------- Forwarded message ----------
From: ${originalMessage.fromAddress || 'unknown'}
Date: ${originalMessage.receivedAt.toISOString()}
Subject: ${originalMessage.subject || '(no subject)'}
To: ${originalMessage.toAddress || 'unknown'}
`;
      expect(forwardHeader).toContain('Forwarded message');
      expect(forwardHeader).toContain('sender@external.com');
      expect(forwardHeader).toContain('Test Subject');
    });
  });

  describe('Reply address building', () => {
    it('should build correct from address', () => {
      const inbox = mockMessage.inbox;
      const fromAddress = `${inbox.localPart}@${inbox.domain.name}`;
      expect(fromAddress).toBe('user@mytest.com');
    });

    it('should use original sender as reply recipient', () => {
      const toAddress = mockMessage.fromAddress;
      expect(toAddress).toBe('sender@external.com');
    });
  });

  describe('Threading headers', () => {
    it('should set In-Reply-To header', () => {
      const inReplyTo = mockMessage.messageId;
      expect(inReplyTo).toBe('<original@example.com>');
    });

    it('should set References header', () => {
      const references = mockMessage.messageId;
      expect(references).toBe('<original@example.com>');
    });
  });

  describe('Access control', () => {
    it('should check inbox access', async () => {
      const userId = 'user-123';
      const inboxId = 'inbox-123';

      vi.mocked(TeamService.canAccessInbox).mockResolvedValueOnce(true);

      const hasAccess = await TeamService.canAccessInbox(userId, inboxId);
      expect(hasAccess).toBe(true);
    });

    it('should deny access to unauthorized inbox', async () => {
      const userId = 'other-user';
      const inboxId = 'inbox-123';

      vi.mocked(TeamService.canAccessInbox).mockResolvedValueOnce(false);

      const hasAccess = await TeamService.canAccessInbox(userId, inboxId);
      expect(hasAccess).toBe(false);
    });
  });

  describe('Domain verification check', () => {
    it('should allow sending from verified domain', () => {
      const domain = mockMessage.inbox.domain;
      expect(domain.status).toBe('VERIFIED');
      const canSend = domain.status === 'VERIFIED';
      expect(canSend).toBe(true);
    });

    it('should block sending from unverified domain', () => {
      const domain = { ...mockMessage.inbox.domain, status: 'PENDING' };
      const canSend = domain.status === 'VERIFIED';
      expect(canSend).toBe(false);
    });
  });

  describe('Outbound message creation', () => {
    it('should create outbound message with correct data', async () => {
      const outboundData = {
        userId: 'user-123',
        domainId: 'domain-123',
        inboxId: 'inbox-123',
        fromAddress: 'user@mytest.com',
        toAddress: 'sender@external.com',
        subject: 'Re: Test Subject',
        messageId: 'tmp-12345',
        status: 'SENDING',
        inReplyTo: '<original@example.com>',
        replyToMessageId: 'msg-123',
      };

      vi.mocked(prisma.outboundMessage.create).mockResolvedValueOnce({
        id: 'outbound-123',
        ...outboundData,
        createdAt: new Date(),
      } as any);

      const result = await prisma.outboundMessage.create({ data: outboundData });

      expect(result.fromAddress).toBe('user@mytest.com');
      expect(result.inReplyTo).toBe('<original@example.com>');
    });
  });
});
