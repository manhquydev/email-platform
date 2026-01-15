import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { CONFIG } from '../shared/config';

// Alarm names
const ALARM_POLL_MESSAGES = 'poll_messages';
const STORAGE_KEY_LAST_MESSAGE_ID = 'last_message_id';

// Setup alarms on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Ephemera Extension Installed');

  // Create an alarm to poll for new messages every 1 minute
  // This is a fallback if real-time push isn't available
  chrome.alarms.create(ALARM_POLL_MESSAGES, {
    periodInMinutes: 1
  });

  // Initialize storage if needed
  const auth = await storage.getAuth();
  if (!auth) {
    await storage.clearAuth();
  }
});

// Handle Alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_POLL_MESSAGES) {
    await pollForMessages();
  }
});

async function pollForMessages() {
  const auth = await storage.getAuth();
  if (!auth.isAuthenticated || !auth.token) return;

  try {
    // 1. Fetch fresh dashboard data to sync inboxes and check unread count
    const dashboard = await api.getDashboard();

    // Sync inboxes to storage for content script access
    if (dashboard.inboxes) {
      await storage.setInboxes(dashboard.inboxes);
    }

    if (dashboard.stats.totalUnread > 0) {
      // 2. Fetch recent messages for each inbox to find the newest one
      // For MVP, we'll just check the first few inboxes
      for (const inbox of dashboard.inboxes.slice(0, 5)) {
        if (inbox.unreadCount > 0) {
          const messagesResponse = await api.getMessages(inbox.id, 5);
          const messages = messagesResponse.data;

          if (messages && messages.length > 0) {
            const newestMessage = messages[0];
            const lastSeenId = (await chrome.storage.local.get(STORAGE_KEY_LAST_MESSAGE_ID))[STORAGE_KEY_LAST_MESSAGE_ID];

            if (newestMessage.id !== lastSeenId && !newestMessage.isRead) {
              // New unread message found!
              showNotification(newestMessage, inbox.address);
              await chrome.storage.local.set({ [STORAGE_KEY_LAST_MESSAGE_ID]: newestMessage.id });

              // Update badge
              chrome.action.setBadgeText({ text: '!' });
              chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });
              break; // Only notify for the newest one in this poll cycle
            }
          }
        }
      }
    } else {
      // Clear badge if no unread
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Polling failed:', error);
  }
}

function showNotification(message: any, email: string) {
  chrome.notifications.create(message.id, {
    type: 'basic',
    iconUrl: 'public/icons/icon128.png',
    title: `New Email for ${email}`,
    message: message.subject || '(No Subject)',
    contextMessage: `From: ${message.from}`,
    priority: 2
  });
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CREATE_INBOX') {
    // Handle background inbox creation
    api.createQuickInbox()
      .then(async response => {
        if (response.success && response.inbox) {
            // Update storage immediately after creation
            const dashboard = await api.getDashboard();
            await storage.setInboxes(dashboard.inboxes);
            sendResponse({ success: true, inbox: response.inbox });
        } else {
            sendResponse({ success: false, error: 'Failed' });
        }
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_INBOXES') {
    api.getDashboard()
      .then(async dashboard => {
        await storage.setInboxes(dashboard.inboxes);
        sendResponse({ success: true, inboxes: dashboard.inboxes });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'SETUP_PUSH') {
    setupPushNotification()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Push Notification Setup
async function setupPushNotification() {
  try {
    const auth = await storage.getAuth();
    if (!auth.isAuthenticated) return;

    // 1. Get VAPID Key
    const { vapidPublicKey } = await api.getVapidKey();

    // 2. Subscribe using Service Worker Registration
    // In MV3, self.registration is available in the service worker
    const registration = (self as any).registration;

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // 3. Send subscription to backend
    await api.subscribePush(subscription);
    console.log('Push notification subscribed');
  } catch (err) {
    console.error('Failed to setup push:', err);
    throw err;
  }
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Handle Push Events
// Note: 'push' event listener must be registered at top level
(self as any).addEventListener('push', (event: any) => {
  console.log('Push event received', event);

  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'New Email';
      const options = {
        body: data.body || 'You have received a new message',
        icon: 'icons/icon128.png',
        data: data.data // e.g. { inboxId: '...', messageId: '...' }
      };

      event.waitUntil(
        (self as any).registration.showNotification(title, options)
      );

      // Also update badge
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });

    } catch (e) {
      console.error('Error parsing push data', e);
    }
  }
});

// Handle Notification Click
(self as any).addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  // Open the extension popup or the web dashboard
  // Extensions cannot programmatically open their own popup window in the same way
  // Best practice: Open a tab to the inbox

  if (event.notification.data && event.notification.data.inboxId) {
    const url = `${CONFIG.WEB_URL}/inbox/${event.notification.data.inboxId}`;
    event.waitUntil(
      chrome.tabs.create({ url })
    );
  } else {
    // Default open
    event.waitUntil(
        chrome.tabs.create({ url: `${CONFIG.WEB_URL}/dashboard` })
    );
  }
});
