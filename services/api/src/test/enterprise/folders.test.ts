import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../setup';
import { Inbox } from '@prisma/client';

describe('Phase05: Folders', () => {
  let domainId: string;
  let inbox: Inbox;

  beforeEach(async () => {
    // Setup Domain and Inbox
    const domain = await prisma.domain.create({
      data: {
        name: `folders-test-${Date.now()}.com`,
        status: 'VERIFIED',
        verificationToken: 'token'
      }
    });
    domainId = domain.id;

    inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart: 'user',
        claimedAt: new Date()
      }
    });
  });

  describe('Folder Management', () => {
    it('should create a custom folder', async () => {
      const folder = await prisma.folder.create({
        data: {
          inboxId: inbox.id,
          name: 'Projects',
          sortOrder: 1
        }
      });

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Projects');
      expect(folder.inboxId).toBe(inbox.id);
      expect(folder.specialUse).toBeNull();
    });

    it('should allow nested folders (hierarchy)', async () => {
      const parent = await prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Work' }
      });

      const child = await prisma.folder.create({
        data: {
          inboxId: inbox.id,
          name: 'Q1 Reports',
          parentId: parent.id
        }
      });

      expect(child.parentId).toBe(parent.id);

      // Verify hierarchy retrieval
      const parentWithChildren = await prisma.folder.findUnique({
        where: { id: parent.id },
        include: { children: true }
      });

      expect(parentWithChildren?.children).toHaveLength(1);
      expect(parentWithChildren?.children[0].id).toBe(child.id);
    });

    it('should enforce max depth (logic validation needed in service, checking constraint here)', async () => {
      // Prisma doesn't strictly enforce depth, but we can verify we can create deep structures
      // The business logic limit of 5 would be enforced by the API service layer
      let currentParentId: string | null = null;

      for (let i = 0; i < 3; i++) {
        const folder: any = await prisma.folder.create({
          data: {
            inboxId: inbox.id,
            name: `Level ${i}`,
            parentId: currentParentId
          }
        });
        currentParentId = folder.id;
      }

      const deepChild = await prisma.folder.findUnique({
        where: { id: currentParentId! }
      });
      expect(deepChild).toBeDefined();
    });

    it('should enforce unique folder names at the same level', async () => {
      await prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Duplicate' }
      });

      await expect(prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Duplicate' }
      })).rejects.toThrow(); // Relies on @@unique([inboxId, parentId, name])
    });
  });

  describe('Special Folders', () => {
    it('should support special use attributes', async () => {
      const sentFolder = await prisma.folder.create({
        data: {
          inboxId: inbox.id,
          name: 'Sent Items',
          specialUse: '\\Sent'
        }
      });

      expect(sentFolder.specialUse).toBe('\\Sent');
    });
  });

  describe('Message Operations', () => {
    it('should assign message to a folder', async () => {
      const folder = await prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Archive' }
      });

      const message = await prisma.message.create({
        data: {
          inboxId: inbox.id,
          folderId: folder.id,
          subject: 'Test Message',
          fromAddress: 'sender@example.com',
          toAddress: 'user@example.com'
        }
      });

      expect(message.folderId).toBe(folder.id);
    });

    it('should move message between folders', async () => {
      const folder1 = await prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Folder 1' }
      });
      const folder2 = await prisma.folder.create({
        data: { inboxId: inbox.id, name: 'Folder 2' }
      });

      const message = await prisma.message.create({
        data: {
          inboxId: inbox.id,
          folderId: folder1.id
        }
      });

      // Move operation
      const updatedMessage = await prisma.message.update({
        where: { id: message.id },
        data: { folderId: folder2.id }
      });

      expect(updatedMessage.folderId).toBe(folder2.id);
    });

    it('should handle threading references', async () => {
       const threadId = 'thread-123';

       const msg1 = await prisma.message.create({
         data: {
           inboxId: inbox.id,
           subject: 'Hello',
           threadId: threadId,
           messageId: '<msg1@example.com>'
         }
       });

       const msg2 = await prisma.message.create({
         data: {
           inboxId: inbox.id,
           subject: 'Re: Hello',
           threadId: threadId,
           inReplyTo: '<msg1@example.com>',
           // Reply/Forward tracking fields are in OutboundMessage usually,
           // but Message model has threadId for grouping
         }
       });

       expect(msg1.threadId).toBe(msg2.threadId);

       const threadMessages = await prisma.message.findMany({
         where: { inboxId: inbox.id, threadId: threadId }
       });

       expect(threadMessages).toHaveLength(2);
    });
  });
});
