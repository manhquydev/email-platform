/**
 * Maildir Sync Service
 * Synchronizes messages between the database and Maildir format for IMAP access
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';

const MAILDIR_ROOT = process.env.MAILDIR_ROOT || '/var/mail';

interface MessageForMaildir {
    id: string;
    messageId: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    subject: string | null;
    receivedAt: Date;
    textBody: string | null;
    htmlBody: string | null;
    headers: Record<string, string> | null;
    inbox: {
        localPart: string;
        domain: {
            name: string;
        };
    };
}

/**
 * Get the Maildir path for a specific inbox
 */
export function getMaildirPath(domainName: string, localPart: string): string {
    return path.join(MAILDIR_ROOT, domainName, localPart);
}

/**
 * Ensure Maildir directory structure exists
 */
export async function ensureMaildirStructure(domainName: string, localPart: string): Promise<void> {
    const basePath = getMaildirPath(domainName, localPart);

    const dirs = [
        path.join(basePath, 'new'),
        path.join(basePath, 'cur'),
        path.join(basePath, 'tmp'),
        path.join(basePath, '.Sent', 'new'),
        path.join(basePath, '.Sent', 'cur'),
        path.join(basePath, '.Sent', 'tmp'),
        path.join(basePath, '.Trash', 'new'),
        path.join(basePath, '.Trash', 'cur'),
        path.join(basePath, '.Trash', 'tmp'),
        path.join(basePath, '.Drafts', 'new'),
        path.join(basePath, '.Drafts', 'cur'),
        path.join(basePath, '.Drafts', 'tmp'),
        path.join(basePath, '.Spam', 'new'),
        path.join(basePath, '.Spam', 'cur'),
        path.join(basePath, '.Spam', 'tmp'),
    ];

    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

/**
 * Generate Maildir-compatible filename
 * Format: timestamp.uniqueId.hostname:flags
 */
export function generateMaildirFilename(messageId: string, isNew: boolean = true): string {
    const timestamp = Date.now();
    const hostname = process.env.HOSTNAME || 'tempmail';

    if (isNew) {
        // Messages in 'new' folder don't have flags
        return `${timestamp}.${messageId}.${hostname}`;
    } else {
        // Messages in 'cur' folder have flags (S = seen)
        return `${timestamp}.${messageId}.${hostname}:2,S`;
    }
}

/**
 * Build RFC822 email content from message data
 */
export function buildRfc822Email(message: MessageForMaildir): string {
    const lines: string[] = [];

    // Add headers
    if (message.fromAddress) {
        lines.push(`From: ${message.fromAddress}`);
    }
    if (message.toAddress) {
        lines.push(`To: ${message.toAddress}`);
    }
    if (message.subject) {
        lines.push(`Subject: ${message.subject}`);
    }
    lines.push(`Date: ${message.receivedAt.toUTCString()}`);
    if (message.messageId) {
        lines.push(`Message-ID: <${message.messageId}>`);
    }
    lines.push('MIME-Version: 1.0');

    // Add custom headers if available
    if (message.headers) {
        for (const [key, value] of Object.entries(message.headers)) {
            // Skip headers we've already added
            if (!['from', 'to', 'subject', 'date', 'message-id', 'mime-version'].includes(key.toLowerCase())) {
                lines.push(`${key}: ${value}`);
            }
        }
    }

    // Determine content type
    if (message.htmlBody) {
        lines.push('Content-Type: text/html; charset=utf-8');
        lines.push('');
        lines.push(message.htmlBody);
    } else {
        lines.push('Content-Type: text/plain; charset=utf-8');
        lines.push('');
        lines.push(message.textBody || '');
    }

    return lines.join('\r\n');
}

/**
 * Sync a single message to Maildir
 */
export async function syncMessageToMaildir(message: MessageForMaildir): Promise<string> {
    const domainName = message.inbox.domain.name;
    const localPart = message.inbox.localPart;

    // Ensure directory structure exists
    await ensureMaildirStructure(domainName, localPart);

    // Generate filename and path
    const filename = generateMaildirFilename(message.id, true);
    const maildirPath = getMaildirPath(domainName, localPart);
    const newPath = path.join(maildirPath, 'new', filename);

    // Build email content
    const emailContent = buildRfc822Email(message);

    // Write to Maildir
    await fs.writeFile(newPath, emailContent, 'utf-8');

    return newPath;
}

/**
 * Mark a message as read in Maildir (move from 'new' to 'cur')
 */
export async function markAsReadInMaildir(
    domainName: string,
    localPart: string,
    messageId: string
): Promise<void> {
    const maildirPath = getMaildirPath(domainName, localPart);
    const newDir = path.join(maildirPath, 'new');
    const curDir = path.join(maildirPath, 'cur');

    try {
        const files = await fs.readdir(newDir);
        const matchingFile = files.find(f => f.includes(messageId));

        if (matchingFile) {
            const oldPath = path.join(newDir, matchingFile);
            const newFilename = matchingFile.includes(':')
                ? matchingFile.replace(/:2,.*$/, ':2,S')
                : `${matchingFile}:2,S`;
            const newPath = path.join(curDir, newFilename);

            await fs.rename(oldPath, newPath);
        }
    } catch (error) {
        console.error('Error marking message as read in Maildir:', error);
    }
}

/**
 * Delete a message from Maildir
 */
export async function deleteFromMaildir(
    domainName: string,
    localPart: string,
    messageId: string
): Promise<void> {
    const maildirPath = getMaildirPath(domainName, localPart);

    for (const subdir of ['new', 'cur']) {
        const dirPath = path.join(maildirPath, subdir);

        try {
            const files = await fs.readdir(dirPath);
            const matchingFile = files.find(f => f.includes(messageId));

            if (matchingFile) {
                await fs.unlink(path.join(dirPath, matchingFile));
                return;
            }
        } catch (error) {
            // Directory might not exist, continue
        }
    }
}

/**
 * Sync all messages for an inbox to Maildir
 */
export async function syncInboxToMaildir(inboxId: string): Promise<number> {
    const messages = await prisma.message.findMany({
        where: {
            inboxId,
            deletedAt: null,
        },
        include: {
            inbox: {
                include: {
                    domain: true,
                },
            },
        },
    });

    let synced = 0;
    for (const message of messages) {
        try {
            await syncMessageToMaildir(message as MessageForMaildir);
            synced++;
        } catch (error) {
            console.error(`Failed to sync message ${message.id}:`, error);
        }
    }

    return synced;
}

/**
 * Sync all inboxes for a domain to Maildir
 */
export async function syncDomainToMaildir(domainId: string): Promise<number> {
    const inboxes = await prisma.inbox.findMany({
        where: {
            domainId,
            deletedAt: null,
        },
    });

    let totalSynced = 0;
    for (const inbox of inboxes) {
        const synced = await syncInboxToMaildir(inbox.id);
        totalSynced += synced;
    }

    return totalSynced;
}
