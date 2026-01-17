/**
 * ARIA Accessibility Utilities
 *
 * Helpers for common ARIA patterns
 */

/**
 * Generate unique ID for ARIA relationships
 */
export const generateAriaId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Screen reader only text (visually hidden)
 */
export const srOnly = "sr-only";

/**
 * Common ARIA labels for email app actions
 */
export const ariaLabels = {
  // Message actions
  markAsRead: "Mark as read",
  markAsUnread: "Mark as unread",
  deleteMessage: "Delete message",
  archiveMessage: "Archive message",
  pinMessage: "Pin message",
  unpinMessage: "Unpin message",
  replyToMessage: "Reply to message",
  forwardMessage: "Forward message",

  // Navigation
  openInbox: "Open inbox",
  closePanel: "Close panel",
  expandMenu: "Expand menu",
  collapseMenu: "Collapse menu",

  // Lists
  emailList: "Email messages",
  inboxList: "Your inboxes",
  attachmentList: "Attachments",

  // Status
  loading: "Loading...",
  newEmail: "New email received",
  connectionStatus: "Connection status",
} as const;

/**
 * Live region announcer for dynamic content
 */
export const announce = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) {
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    // Clear after announcement
    setTimeout(() => { announcer.textContent = ''; }, 1000);
  }
};
