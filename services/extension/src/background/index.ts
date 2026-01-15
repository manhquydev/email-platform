import { storage } from '../shared/storage';
import { api } from '../shared/api';

// Alarm names
const ALARM_POLL_MESSAGES = 'poll_messages';

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
  if (!auth.isAuthenticated || !auth.user) return;

  try {
    // Get list of inboxes from storage to know what to poll
    // Or fetch fresh list
    // For MVP, we might just log or skip complex polling logic until we have the UI ready
    console.log('Polling for new messages...');

    // Logic to check for new messages and show notification
    // ...
  } catch (error) {
    console.error('Polling failed:', error);
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CREATE_INBOX') {
    // Handle background inbox creation
    api.createQuickInbox()
      .then(response => {
        if (response.success) {
            sendResponse({ success: true, inbox: response.inbox });
        } else {
            sendResponse({ success: false, error: 'Failed' });
        }
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
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
    const url = `https://manhquy.click/inbox/${event.notification.data.inboxId}`;
    event.waitUntil(
      chrome.tabs.create({ url })
    );
  } else {
    // Default open
    event.waitUntil(
        chrome.tabs.create({ url: 'https://manhquy.click/dashboard' })
    );
  }
});
