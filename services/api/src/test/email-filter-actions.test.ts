import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
    message: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    label: {
        findFirst: vi.fn(),
    },
    messageLabel: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
    folder: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    outboundMessage: {
        create: vi.fn(),
        update: vi.fn(),
    },
}));

const outboundServiceMock = vi.hoisted(() => ({
    sendEmail: vi.fn(),
}));

const appConfigMock = vi.hoisted(() => ({
    outboundEnabled: true,
}));

vi.mock('../lib/prisma', () => ({
    prisma: prismaMock,
}));

vi.mock('../services/outbound', () => ({
    outboundService: outboundServiceMock,
}));

vi.mock('../config', () => ({
    appConfig: appConfigMock,
}));

import { executeFilterActions } from '../services/emailFilters';

const baseMessage = {
    id: 'msg-1',
    inboxId: 'inbox-1',
    messageId: '<original@example.com>',
    fromAddress: 'sender@example.com',
    toAddress: 'inbox@example.com',
    subject: 'Quarterly update',
    textBody: 'Plain text body',
    htmlBody: '<p>Plain text body</p>',
    receivedAt: new Date('2026-04-08T01:02:03.000Z'),
    inbox: {
        localPart: 'inbox',
        domain: {
            id: 'domain-1',
            name: 'example.com',
            ownerId: 'user-1',
            status: 'VERIFIED',
        },
    },
};

describe('executeFilterActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appConfigMock.outboundEnabled = true;
        prismaMock.message.update.mockResolvedValue({});
        prismaMock.message.findUnique.mockResolvedValue(baseMessage);
        prismaMock.folder.findFirst.mockResolvedValue(null);
        prismaMock.folder.create.mockResolvedValue({ id: 'folder-archive', name: 'Archive' });
        prismaMock.outboundMessage.create.mockResolvedValue({ id: 'outbound-1' });
        prismaMock.outboundMessage.update.mockResolvedValue({});
        outboundServiceMock.sendEmail.mockResolvedValue({
            messageId: '<forwarded@example.com>',
            provider: 'smtp',
        });
    });

    it('moves a message into an existing folder', async () => {
        prismaMock.folder.findFirst.mockResolvedValue({ id: 'folder-custom', name: 'Important' });

        const result = await executeFilterActions('msg-1', [
            { type: 'MOVE_TO_FOLDER', value: 'Important' },
        ]);

        expect(prismaMock.message.update).toHaveBeenCalledWith({
            where: { id: 'msg-1' },
            data: { folderId: 'folder-custom' },
        });
        expect(result).toEqual({
            actionsExecuted: ['MOVE_TO_FOLDER:Important'],
            shouldDelete: false,
        });
    });

    it('creates a special folder on demand before moving the message', async () => {
        prismaMock.folder.findFirst.mockResolvedValueOnce(null);

        const result = await executeFilterActions('msg-1', [
            { type: 'MOVE_TO_FOLDER', value: 'Archive' },
        ]);

        expect(prismaMock.folder.create).toHaveBeenCalledWith({
            data: {
                inboxId: 'inbox-1',
                name: 'Archive',
                specialUse: '\\Archive',
                sortOrder: 5,
            },
        });
        expect(result.actionsExecuted).toEqual(['MOVE_TO_FOLDER:Archive']);
    });

    it('forwards a message through the outbound service and records success', async () => {
        const result = await executeFilterActions('msg-1', [
            { type: 'FORWARD', value: 'dest@example.net' },
        ]);

        expect(prismaMock.outboundMessage.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-1',
                domainId: 'domain-1',
                inboxId: 'inbox-1',
                fromAddress: 'inbox@example.com',
                toAddress: 'dest@example.net',
                status: 'SENDING',
                replyToMessageId: 'msg-1',
            }),
        });
        expect(outboundServiceMock.sendEmail).toHaveBeenCalledWith(
            'inbox@example.com',
            'dest@example.net',
            'Fwd: Quarterly update',
            expect.stringContaining('Forwarded message'),
            expect.stringContaining('<p><strong>Forwarded message</strong></p>'),
            undefined,
            expect.objectContaining({
                replyTo: 'sender@example.com',
                headers: expect.objectContaining({
                    'X-Ephemera-Filter-Action': 'FORWARD',
                }),
            })
        );
        expect(prismaMock.outboundMessage.update).toHaveBeenCalledWith({
            where: { id: 'outbound-1' },
            data: {
                messageId: '<forwarded@example.com>',
                status: 'SENT',
                sentAt: expect.any(Date),
                espProvider: 'smtp',
                espMessageId: '<forwarded@example.com>',
            },
        });
        expect(result.actionsExecuted).toEqual(['FORWARD:dest@example.net']);
    });

    it('skips forwarding with explicit status when outbound is disabled', async () => {
        appConfigMock.outboundEnabled = false;

        const result = await executeFilterActions('msg-1', [
            { type: 'FORWARD', value: 'dest@example.net' },
        ]);

        expect(prismaMock.message.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.outboundMessage.create).not.toHaveBeenCalled();
        expect(result.actionsExecuted).toEqual(['FORWARD_SKIPPED:dest@example.net:OUTBOUND_DISABLED']);
    });

    it('records a failed forward attempt without throwing', async () => {
        outboundServiceMock.sendEmail.mockRejectedValue(new Error('provider unavailable'));

        const result = await executeFilterActions('msg-1', [
            { type: 'FORWARD', value: 'dest@example.net' },
        ]);

        expect(prismaMock.outboundMessage.update).toHaveBeenCalledWith({
            where: { id: 'outbound-1' },
            data: {
                status: 'FAILED',
                bounceMessage: 'provider unavailable',
                lastAttemptAt: expect.any(Date),
                attempts: { increment: 1 },
            },
        });
        expect(result.actionsExecuted).toEqual(['FORWARD_FAILED:dest@example.net']);
    });
});
