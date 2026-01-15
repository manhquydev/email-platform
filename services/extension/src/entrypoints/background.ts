import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { handlePushMessage, handleNotificationClick, updateBadge } from '../background/push-handler';

export default defineBackground(() => {
  // Alarm names
  const ALARM_POLL_MESSAGES = 'poll_messages';
  const STORAGE_KEY_LAST_MESSAGE_ID = 'last_message_id';

  // Setup alarms and context menus on install
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('Ephemera Extension Installed');

    // Create context menu for email fields
    chrome.contextMenus.create({
      id: 'fill-ephemera-email',
      title: 'Fill with Ephemera Email',
      contexts: ['editable'],
    });

    // Create an alarm to poll for new messages every 1 minute
    chrome.alarms.create(ALARM_POLL_MESSAGES, {
      periodInMinutes: 1
    });

    // Initialize storage if needed
    const auth = await storage.getAuth();
    if (!auth?.isAuthenticated) {
      await storage.clearAuth();
    } else {
      // Re-setup push if authenticated on startup
      setupPushNotification().catch(console.error);
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
      const dashboard = await api.getDashboard();

      if (dashboard.inboxes) {
        await storage.setInboxes(dashboard.inboxes);
      }

      if (dashboard.stats.totalUnread > 0) {
        for (const inbox of dashboard.inboxes.slice(0, 5)) {
          if (inbox.unreadCount > 0) {
            const messagesResponse = await api.getMessages(inbox.id, 5);
            const messages = messagesResponse.data;

            if (messages && messages.length > 0) {
              const newestMessage = messages[0];
              const storageResult = await chrome.storage.local.get(STORAGE_KEY_LAST_MESSAGE_ID);
              const lastSeenId = storageResult[STORAGE_KEY_LAST_MESSAGE_ID];

              if (newestMessage.id !== lastSeenId && !newestMessage.isRead) {
                // Use refined push handler logic even for poll notifications
                await handlePushMessage({
                  type: 'new_message',
                  messageId: newestMessage.id,
                  inboxId: inbox.id,
                  from: newestMessage.from,
                  subject: newestMessage.subject,
                  preview: newestMessage.textBody?.substring(0, 100) || '',
                  receivedAt: newestMessage.receivedAt
                });
                await chrome.storage.local.set({ [STORAGE_KEY_LAST_MESSAGE_ID]: newestMessage.id });
                break;
              }
            }
          }
        }
      } else {
        await updateBadge('');
      }
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  // Handle Context Menu Clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'fill-ephemera-email' && tab?.id) {
      try {
        const result = await chrome.storage.local.get(['inboxes', 'auth']);
        const inboxes = result.inboxes || [];
        const auth = result.auth;

        if (!auth?.isAuthenticated) {
          chrome.notifications.create('login-required', {
            type: 'basic',
            iconUrl: '/icons/icon128.png',
            title: 'Sign in Required',
            message: 'Please sign in to your Ephemera account to use this feature.',
          });
          return;
        }

        let emailToFill = '';
        if (inboxes.length > 0) {
          const first = inboxes[0];
          emailToFill = first.address || `${first.localPart}@${typeof first.domain === 'string' ? first.domain : first.domain.name}`;
        } else {
          const response = await api.createQuickInbox();
          if (response.success && response.inbox) {
            const inbox = response.inbox;
            emailToFill = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : (inbox.domain?.name || 'domain')}`;
            const dashboard = await api.getDashboard();
            await storage.setInboxes(dashboard.inboxes);
          }
        }

        if (emailToFill) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (email) => {
              const activeEl = document.activeElement as HTMLInputElement;
              if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                activeEl.value = email;
                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                activeEl.dispatchEvent(new Event('change', { bubbles: true }));
              }
            },
            args: [emailToFill],
          });
        }
      } catch (error) {
        console.error('Context menu action failed:', error);
      }
    }
  });

  // Handle messages
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'CREATE_INBOX') {
      api.createQuickInbox()
        .then(async response => {
          if (response.success && response.inbox) {
              const dashboard = await api.getDashboard();
              await storage.setInboxes(dashboard.inboxes);
              sendResponse({ success: true, inbox: response.inbox });
          } else {
              sendResponse({ success: false, error: 'Failed' });
          }
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
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

      const { vapidPublicKey } = await api.getVapidKey();
      const registration = (self as any).registration;
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await api.subscribePush(subscription);
      console.log('Push notification subscribed');
    } catch (err) {
      console.error('Failed to setup push:', err);
      throw err;
    }
  }

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
  // @ts-ignore
  self.addEventListener('push', (event: any) => {
    if (event.data) {
      try {
        const data = event.data.json();
        event.waitUntil(handlePushMessage(data));
      } catch (e) {
        console.error('Error parsing push data', e);
      }
    }
  });

  // Handle Notification Click
  // @ts-ignore
  self.addEventListener('notificationclick', (event: any) => {
    handleNotificationClick(event);
  });
});
