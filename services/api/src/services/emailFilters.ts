/**
 * Email Filter Service
 * Evaluates email filters and executes actions on incoming messages
 */

import { appConfig } from '../config';
import { prisma } from '../lib/prisma';
import { buildTempOutboundMessageId } from '../routes/messages/utilities';
import { outboundService } from './outbound';

export interface FilterCondition {
    field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'HAS_ATTACHMENT';
    operator: 'CONTAINS' | 'NOT_CONTAINS' | 'EQUALS' | 'NOT_EQUALS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
    value: string;
}

export interface FilterAction {
    type: 'MOVE_TO_FOLDER' | 'ADD_LABEL' | 'REMOVE_LABEL' | 'MARK_READ' | 'MARK_SPAM' | 'DELETE' | 'FORWARD';
    value?: string;
}

export interface EmailData {
    fromAddress?: string | null;
    toAddress?: string | null;
    subject?: string | null;
    textBody?: string | null;
    htmlBody?: string | null;
    hasAttachment: boolean;
}

type MessageContext = {
    id: string;
    inboxId: string;
    messageId: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    subject: string | null;
    textBody: string | null;
    htmlBody: string | null;
    receivedAt: Date;
    inbox: {
        localPart: string;
        domain: {
            id: string;
            name: string;
            ownerId: string;
            status: string;
        };
    };
};

const SPECIAL_FOLDER_CONFIG: Record<string, { name: string; specialUse: string; sortOrder: number }> = {
    inbox: { name: 'Inbox', specialUse: '\\Inbox', sortOrder: 0 },
    drafts: { name: 'Drafts', specialUse: '\\Drafts', sortOrder: 1 },
    sent: { name: 'Sent', specialUse: '\\Sent', sortOrder: 2 },
    spam: { name: 'Spam', specialUse: '\\Junk', sortOrder: 3 },
    junk: { name: 'Spam', specialUse: '\\Junk', sortOrder: 3 },
    trash: { name: 'Trash', specialUse: '\\Trash', sortOrder: 4 },
    archive: { name: 'Archive', specialUse: '\\Archive', sortOrder: 5 },
};

function normalizeActionValue(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}

function buildForwardSubject(subject?: string | null): string {
    const baseSubject = subject?.trim() || '(no subject)';
    return baseSubject.toLowerCase().startsWith('fwd:') ? baseSubject : `Fwd: ${baseSubject}`;
}

function buildForwardText(message: MessageContext): string {
    const header = [
        'Forwarded message',
        `From: ${message.fromAddress || '(unknown sender)'}`,
        `To: ${message.toAddress || '(unknown recipient)'}`,
        `Subject: ${message.subject || '(no subject)'}`,
        `Received: ${message.receivedAt.toISOString()}`,
    ].join('\n');

    const originalBody = message.textBody || message.htmlBody || '(no body)';
    return `${header}\n\n${originalBody}`;
}

function buildForwardHtml(message: MessageContext): string | undefined {
    if (!message.htmlBody && !message.textBody) {
        return undefined;
    }

    const originalBody = message.htmlBody || `<pre>${message.textBody}</pre>`;
    return [
        '<div>',
        '<p><strong>Forwarded message</strong></p>',
        `<p><strong>From:</strong> ${message.fromAddress || '(unknown sender)'}<br/>`,
        `<strong>To:</strong> ${message.toAddress || '(unknown recipient)'}<br/>`,
        `<strong>Subject:</strong> ${message.subject || '(no subject)'}<br/>`,
        `<strong>Received:</strong> ${message.receivedAt.toISOString()}</p>`,
        '<hr/>',
        originalBody,
        '</div>',
    ].join('');
}

async function getMessageContext(messageId: string): Promise<MessageContext | null> {
    return prisma.message.findUnique({
        where: { id: messageId },
        select: {
            id: true,
            inboxId: true,
            messageId: true,
            fromAddress: true,
            toAddress: true,
            subject: true,
            textBody: true,
            htmlBody: true,
            receivedAt: true,
            inbox: {
                select: {
                    localPart: true,
                    domain: {
                        select: {
                            id: true,
                            name: true,
                            ownerId: true,
                            status: true,
                        },
                    },
                },
            },
        },
    }) as Promise<MessageContext | null>;
}

async function resolveFolder(inboxId: string, folderValue: string) {
    const normalizedValue = folderValue.trim();
    const specialFolder = SPECIAL_FOLDER_CONFIG[normalizedValue.toLowerCase()];
    const folder = await prisma.folder.findFirst({
        where: {
            inboxId,
            OR: [
                { id: normalizedValue },
                { name: { equals: normalizedValue, mode: 'insensitive' } },
                ...(specialFolder ? [{ specialUse: specialFolder.specialUse }] : []),
            ],
        },
    });

    if (folder || !specialFolder) {
        return folder;
    }

    try {
        return await prisma.folder.create({
            data: {
                inboxId,
                name: specialFolder.name,
                specialUse: specialFolder.specialUse,
                sortOrder: specialFolder.sortOrder,
            },
        });
    } catch {
        return prisma.folder.findFirst({
            where: {
                inboxId,
                OR: [
                    { name: { equals: specialFolder.name, mode: 'insensitive' } },
                    { specialUse: specialFolder.specialUse },
                ],
            },
        });
    }
}

/**
 * Evaluate a single condition against email data
 */
function evaluateCondition(condition: FilterCondition, email: EmailData): boolean {
    let fieldValue: string = '';

    switch (condition.field) {
        case 'FROM':
            fieldValue = email.fromAddress?.toLowerCase() || '';
            break;
        case 'TO':
            fieldValue = email.toAddress?.toLowerCase() || '';
            break;
        case 'SUBJECT':
            fieldValue = email.subject?.toLowerCase() || '';
            break;
        case 'BODY':
            fieldValue = (email.textBody || email.htmlBody || '').toLowerCase();
            break;
        case 'HAS_ATTACHMENT':
            return email.hasAttachment === (condition.value.toLowerCase() === 'true');
    }

    const compareValue = condition.value.toLowerCase();

    switch (condition.operator) {
        case 'CONTAINS':
            return fieldValue.includes(compareValue);
        case 'NOT_CONTAINS':
            return !fieldValue.includes(compareValue);
        case 'EQUALS':
            return fieldValue === compareValue;
        case 'NOT_EQUALS':
            return fieldValue !== compareValue;
        case 'STARTS_WITH':
            return fieldValue.startsWith(compareValue);
        case 'ENDS_WITH':
            return fieldValue.endsWith(compareValue);
        case 'REGEX':
            try {
                const regex = new RegExp(condition.value, 'i');
                return regex.test(fieldValue);
            } catch {
                return false;
            }
        default:
            return false;
    }
}

/**
 * Evaluate all conditions for a filter
 */
function evaluateConditions(
    conditions: FilterCondition[],
    email: EmailData,
    matchType: 'ALL' | 'ANY'
): boolean {
    if (conditions.length === 0) return true;

    if (matchType === 'ALL') {
        return conditions.every(c => evaluateCondition(c, email));
    } else {
        return conditions.some(c => evaluateCondition(c, email));
    }
}

/**
 * Get matching filters for an inbox
 */
export async function getMatchingFilters(
    inboxId: string,
    email: EmailData
): Promise<Array<{ id: string; name: string; actions: FilterAction[] }>> {
    const filters = await prisma.emailFilter.findMany({
        where: {
            inboxId,
            isEnabled: true,
        },
        orderBy: { priority: 'desc' },
    });

    const matching: Array<{ id: string; name: string; actions: FilterAction[] }> = [];

    for (const filter of filters) {
        const conditions = filter.conditions as unknown as FilterCondition[];
        const matchType = filter.matchType as 'ALL' | 'ANY';

        if (evaluateConditions(conditions, email, matchType)) {
            matching.push({
                id: filter.id,
                name: filter.name,
                actions: filter.actions as unknown as FilterAction[],
            });
        }
    }

    return matching;
}

/**
 * Execute filter actions on a message
 */
export async function executeFilterActions(
    messageId: string,
    actions: FilterAction[]
): Promise<{ actionsExecuted: string[]; shouldDelete: boolean }> {
    const actionsExecuted: string[] = [];
    let shouldDelete = false;
    let cachedMessageContext: Promise<MessageContext | null> | undefined;

    const loadMessageContext = async () => {
        if (!cachedMessageContext) {
            cachedMessageContext = getMessageContext(messageId);
        }
        return cachedMessageContext;
    };

    for (const action of actions) {
        switch (action.type) {
            case 'MARK_READ':
                await prisma.message.update({
                    where: { id: messageId },
                    data: { isRead: true },
                });
                actionsExecuted.push('MARK_READ');
                break;

            case 'MARK_SPAM':
                await prisma.message.update({
                    where: { id: messageId },
                    data: { spamScore: 100 },  // High spam score
                });
                actionsExecuted.push('MARK_SPAM');
                break;

            case 'DELETE':
                shouldDelete = true;
                actionsExecuted.push('DELETE');
                break;

            case 'ADD_LABEL':
                if (action.value) {
                    // Find or create the label
                    const message = await prisma.message.findUnique({
                        where: { id: messageId },
                        select: { inboxId: true },
                    });

                    if (message) {
                        const label = await prisma.label.findFirst({
                            where: { inboxId: message.inboxId, name: action.value },
                        });

                        if (label) {
                            await prisma.messageLabel.upsert({
                                where: { messageId_labelId: { messageId, labelId: label.id } },
                                create: { messageId, labelId: label.id },
                                update: {},
                            });
                            actionsExecuted.push(`ADD_LABEL:${action.value}`);
                        }
                    }
                }
                break;

            case 'REMOVE_LABEL':
                if (action.value) {
                    const message = await prisma.message.findUnique({
                        where: { id: messageId },
                        select: { inboxId: true },
                    });

                    if (message) {
                        const label = await prisma.label.findFirst({
                            where: { inboxId: message.inboxId, name: action.value },
                        });

                        if (label) {
                            await prisma.messageLabel.deleteMany({
                                where: { messageId, labelId: label.id },
                            });
                            actionsExecuted.push(`REMOVE_LABEL:${action.value}`);
                        }
                    }
                }
                break;

            case 'MOVE_TO_FOLDER':
                {
                    const targetFolder = normalizeActionValue(action.value);
                    if (!targetFolder) {
                        actionsExecuted.push('MOVE_TO_FOLDER_SKIPPED:MISSING_TARGET');
                        break;
                    }

                    const message = await loadMessageContext();
                    if (!message) {
                        actionsExecuted.push(`MOVE_TO_FOLDER_SKIPPED:${targetFolder}:MESSAGE_NOT_FOUND`);
                        break;
                    }

                    const folder = await resolveFolder(message.inboxId, targetFolder);
                    if (!folder) {
                        actionsExecuted.push(`MOVE_TO_FOLDER_SKIPPED:${targetFolder}:FOLDER_NOT_FOUND`);
                        break;
                    }

                    await prisma.message.update({
                        where: { id: messageId },
                        data: { folderId: folder.id },
                    });
                    actionsExecuted.push(`MOVE_TO_FOLDER:${folder.name}`);
                }
                break;

            case 'FORWARD':
                {
                    const forwardTo = normalizeActionValue(action.value);
                    if (!forwardTo) {
                        actionsExecuted.push('FORWARD_SKIPPED:MISSING_TARGET');
                        break;
                    }

                    if (!appConfig.outboundEnabled) {
                        actionsExecuted.push(`FORWARD_SKIPPED:${forwardTo}:OUTBOUND_DISABLED`);
                        break;
                    }

                    const message = await loadMessageContext();
                    if (!message) {
                        actionsExecuted.push(`FORWARD_SKIPPED:${forwardTo}:MESSAGE_NOT_FOUND`);
                        break;
                    }

                    if (message.inbox.domain.status !== 'VERIFIED') {
                        actionsExecuted.push(`FORWARD_SKIPPED:${forwardTo}:DOMAIN_NOT_VERIFIED`);
                        break;
                    }

                    const outboundRecord = await prisma.outboundMessage.create({
                        data: {
                            userId: message.inbox.domain.ownerId,
                            domainId: message.inbox.domain.id,
                            inboxId: message.inboxId,
                            fromAddress: `${message.inbox.localPart}@${message.inbox.domain.name}`,
                            toAddress: forwardTo,
                            subject: buildForwardSubject(message.subject),
                            messageId: buildTempOutboundMessageId(),
                            status: 'SENDING',
                            replyToMessageId: message.id,
                            metadata: {
                                source: 'email-filter',
                                filterAction: 'FORWARD',
                                originalMessageId: message.id,
                            },
                        },
                    });

                    try {
                        const info = await outboundService.sendEmail(
                            `${message.inbox.localPart}@${message.inbox.domain.name}`,
                            forwardTo,
                            buildForwardSubject(message.subject),
                            buildForwardText(message),
                            buildForwardHtml(message),
                            undefined,
                            {
                                replyTo: message.fromAddress || undefined,
                                headers: {
                                    'X-Ephemera-Filter-Action': 'FORWARD',
                                    'X-Ephemera-Original-Message-Id': message.messageId || message.id,
                                },
                            }
                        );

                        await prisma.outboundMessage.update({
                            where: { id: outboundRecord.id },
                            data: {
                                messageId: info.messageId,
                                status: 'SENT',
                                sentAt: new Date(),
                                espProvider: info.provider || null,
                                espMessageId: info.messageId || null,
                            },
                        });
                        actionsExecuted.push(`FORWARD:${forwardTo}`);
                    } catch (error) {
                        const messageText = error instanceof Error ? error.message : 'Forwarding failed';
                        await prisma.outboundMessage.update({
                            where: { id: outboundRecord.id },
                            data: {
                                status: 'FAILED',
                                bounceMessage: messageText,
                                lastAttemptAt: new Date(),
                                attempts: { increment: 1 },
                            },
                        }).catch(() => undefined);
                        actionsExecuted.push(`FORWARD_FAILED:${forwardTo}`);
                    }
                }
                break;
        }
    }

    return { actionsExecuted, shouldDelete };
}

/**
 * Process filters for an incoming message
 */
export async function processFiltersForMessage(
    messageId: string,
    inboxId: string,
    email: EmailData
): Promise<{ filtersMatched: number; actionsExecuted: string[]; deleted: boolean }> {
    const matchingFilters = await getMatchingFilters(inboxId, email);

    const allActionsExecuted: string[] = [];
    let deleted = false;

    for (const filter of matchingFilters) {
        const { actionsExecuted, shouldDelete } = await executeFilterActions(
            messageId,
            filter.actions
        );

        allActionsExecuted.push(...actionsExecuted);

        if (shouldDelete) {
            await prisma.message.update({
                where: { id: messageId },
                data: { deletedAt: new Date() },
            });
            deleted = true;
            break;  // Stop processing after delete
        }
    }

    return {
        filtersMatched: matchingFilters.length,
        actionsExecuted: allActionsExecuted,
        deleted,
    };
}
