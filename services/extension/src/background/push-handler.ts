// Push Handler logic to be imported in background script

interface PushPayload {
  type: 'new_message'
  messageId: string
  inboxId: string
  from: string
  subject: string
  preview: string
  receivedAt: string
}

export async function handlePushMessage(payload: PushPayload) {
   console.log('Handling push message:', payload);

   // Show notification
   const { from, subject, preview, messageId } = payload;

   const notificationId = `msg-${messageId}`;

   await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png', // Ensure this path is correct relative to background
      title: from || 'New Email',
      message: subject || '(no subject)',
      contextMessage: preview?.slice(0, 50),
      priority: 2,
      requireInteraction: false
   });

   // Store metadata for click handling if needed
}

export async function updateBadge(text?: string) {
    // If text provided, set it. Otherwise fetch.
    if (text !== undefined) {
        chrome.action.setBadgeText({ text });
        if (text) {
             chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });
        }
    }
}
