/**
 * Email Filter Service
 * Evaluates email filters and executes actions on incoming messages
 */

import { prisma } from '../lib/prisma';

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

            // MOVE_TO_FOLDER and FORWARD could be implemented with additional logic
            case 'MOVE_TO_FOLDER':
                actionsExecuted.push(`MOVE_TO_FOLDER:${action.value}`);
                break;

            case 'FORWARD':
                // Would require outbound email integration
                actionsExecuted.push(`FORWARD:${action.value}`);
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
