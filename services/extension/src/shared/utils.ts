import { Inbox } from './types';
import browser from 'webextension-polyfill';

/**
 * Sends a message to the background script with proper error handling.
 * This handles the back/forward cache (bfcache) error gracefully.
 * When a page is restored from bfcache, the message channel may be closed.
 *
 * @param message The message to send
 * @returns Promise that resolves with the response or null on bfcache error
 */
export async function safeSendMessage<T = any>(message: any): Promise<T | null> {
  try {
    const response = await browser.runtime.sendMessage(message);
    return response as T;
  } catch (error: any) {
    // Handle bfcache errors gracefully - these are expected when page is restored from cache
    const errorMessage = error?.message || '';
    if (
      errorMessage.includes('back/forward cache') ||
      errorMessage.includes('message channel is closed') ||
      errorMessage.includes('Extension context invalidated') ||
      errorMessage.includes('Receiving end does not exist')
    ) {
      console.debug('[Ephemera] Message channel closed (bfcache), ignoring:', errorMessage);
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

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
    domain: domainName,
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
