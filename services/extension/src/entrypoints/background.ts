import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { analytics } from '../shared/analytics';
import { handlePushMessage, handleNotificationClick, updateBadge } from '../background/push-handler';
import browser from 'webextension-polyfill';

export default defineBackground(() => {
  // Alarm names
  const ALARM_POLL_MESSAGES = 'poll_messages';
  const STORAGE_KEY_LAST_MESSAGE_ID = 'last_message_id';

  // Setup alarms and context menus on install
  browser.runtime.onInstalled.addListener(async () => {
    console.log('Ephemera Extension Installed');

    // Setup initial context menus
    await setupContextMenus();

    // Create an alarm to poll for new messages every 1 minute
    browser.alarms.create(ALARM_POLL_MESSAGES, {
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

  async function setupContextMenus() {
    await browser.contextMenus.removeAll();

    // Parent Menu
    browser.contextMenus.create({
      id: 'ephemera-parent',
      title: 'Ephemera',
      contexts: ['editable'],
    });

    // Quick Actions
    browser.contextMenus.create({
      id: 'generate-new',
      parentId: 'ephemera-parent',
      title: 'Generate New Email',
      contexts: ['editable'],
    });

    browser.contextMenus.create({
      id: 'sep-1',
      parentId: 'ephemera-parent',
      type: 'separator',
      contexts: ['editable'],
    });

    // Existing Inboxes (will be populated dynamically)
    const result = await browser.storage.local.get('inboxes');
    const inboxes = (result.inboxes as any[]) || [];
    if (inboxes.length === 0) {
      browser.contextMenus.create({
        id: 'no-inboxes',
        parentId: 'ephemera-parent',
        title: 'No active inboxes',
        enabled: false,
        contexts: ['editable'],
      });
    } else {
      inboxes.slice(0, 8).forEach((inbox: any) => {
        const email = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`;
        browser.contextMenus.create({
          id: `fill-${inbox.id}`,
          parentId: 'ephemera-parent',
          title: email,
          contexts: ['editable'],
        });
      });
    }
  }

  // Handle Context Menu Clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    try {
      const result = await browser.storage.local.get(['auth', 'inboxes']);
      const auth = result.auth as any;
      const inboxes = (result.inboxes as any[]) || [];

      if (!auth?.isAuthenticated) {
        browser.notifications.create('login-required', {
          type: 'basic',
          iconUrl: '/icons/icon128.png',
          title: 'Sign in Required',
          message: 'Please sign in to your Ephemera account to use this feature.',
        });
        return;
      }

      let emailToFill = '';

      if (info.menuItemId === 'generate-new') {
        const response = await api.createQuickInbox();
        if (response.success && response.inbox) {
          analytics.track('inbox_created_quick', { context: 'context_menu' });
          const inbox = response.inbox;
          emailToFill = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : (inbox.domain?.name || 'domain')}`;

          // Sync and refresh menus
          const dashboard = await api.getDashboard();
          await storage.setInboxes(dashboard.inboxes);
          await setupContextMenus();
        }
      } else if (String(info.menuItemId).startsWith('fill-')) {
        const menuItemId = info.menuItemId as string;
        const inboxId = menuItemId.replace('fill-', '');
        analytics.track('settings_updated', { setting: 'context_menu_fill' });
        const targetInbox = inboxes.find((i: any) => i.id === inboxId);
        if (targetInbox) {
          emailToFill = targetInbox.address || `${targetInbox.localPart}@${typeof targetInbox.domain === 'string' ? targetInbox.domain : targetInbox.domain.name}`;
        }
      }

      if (emailToFill) {
        browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (email: string) => {
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
  });

  // Handle messages
  browser.runtime.onMessage.addListener((message: any, _sender: any) => {
    if (message.type === 'CREATE_INBOX') {
      analytics.track('inbox_created_quick', { context: 'content_script_dropdown' });
      return api.createQuickInbox()
        .then(async response => {
          if (response.success && response.inbox) {
              const dashboard = await api.getDashboard();
              await storage.setInboxes(dashboard.inboxes);
              return { success: true, inbox: response.inbox };
          } else {
              return { success: false, error: 'Failed' };
          }
        })
        .catch(error => ({ success: false, error: error.message }));
    }

    if (message.type === 'GET_INBOXES') {
      return api.getDashboard()
        .then(async dashboard => {
          await storage.setInboxes(dashboard.inboxes);
          return { success: true, inboxes: dashboard.inboxes };
        })
        .catch(error => ({ success: false, error: error.message }));
    }

    if (message.type === 'SETUP_PUSH') {
      return setupPushNotification()
        .then(() => ({ success: true }))
        .catch(err => ({ success: false, error: err.message }));
    }

    if (message.type === 'TRACK_EVENT') {
      analytics.track(message.event, message.metadata);
      return Promise.resolve({ success: true });
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
