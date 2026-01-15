import { Inbox } from './types';

/**
 * Normalizes an inbox object to ensure a consistent format across the extension.
 * This handles differences between various API endpoints and versions.
 */
export function normalizeInbox(inbox: any): Inbox {
  const domainName = typeof inbox.domain === 'string'
    ? inbox.domain
    : (inbox.domain?.name || 'domain');

  return {
    id: inbox.id,
    localPart: inbox.localPart,
    domain: domainName, // Store as string for simplicity in content scripts, or keep as is?
    address: inbox.address || `${inbox.localPart}@${domainName}`,
    createdAt: inbox.createdAt,
    expiresAt: inbox.expiresAt,
    unreadCount: inbox.unreadCount ?? inbox._count?.messages ?? 0,
    _count: {
      messages: inbox.unreadCount ?? inbox._count?.messages ?? 0
    }
  };
}

/**
 * Normalizes a list of inboxes.
 */
export function normalizeInboxes(inboxes: any[]): Inbox[] {
  if (!Array.isArray(inboxes)) return [];
  return inboxes.map(normalizeInbox);
}
