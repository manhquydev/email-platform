import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { analytics } from '../shared/analytics';
import { handlePushMessage, handleNotificationClick, updateBadge } from '../background/push-handler';
import { createAutomationInbox, pollLatestOtp } from '../background/openai-auth-automation-service';
import browser from 'webextension-polyfill';

export default defineBackground(() => {
  // Alarm names
  const ALARM_POLL_MESSAGES = 'poll_messages';
  const STORAGE_KEY_LAST_MESSAGE_ID = 'last_message_id';
  const STORAGE_KEY_AUTOMATION_STATE = 'openai_auth_automation_state';

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
      setupPushNotificationWithRetry().catch(console.error);
    }
  });

  // Verify alarm exists on browser startup (may be cleared on restart)
  browser.runtime.onStartup.addListener(async () => {
    console.log('[Background] Browser startup - verifying alarms');
    const alarm = await browser.alarms.get(ALARM_POLL_MESSAGES);
    if (!alarm) {
      browser.alarms.create(ALARM_POLL_MESSAGES, {
        periodInMinutes: 1
      });
    }

    // Re-setup push if authenticated
    const auth = await storage.getAuth();
    if (auth?.isAuthenticated) {
      setupPushNotificationWithRetry().catch(console.error);
    }
  });

  // Handle alarm for periodic polling
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_POLL_MESSAGES) {
      const auth = await storage.getAuth();
      if (!auth?.isAuthenticated) return;

      try {
        const dashboard = await api.getDashboard();
        const totalUnread = dashboard.stats?.totalUnread || 0;
        updateBadge(totalUnread > 0 ? String(totalUnread) : '');
      } catch (e) {
        console.error('[Background] Poll failed:', e);
      }
    }
  });

  // Listen for keyboard shortcuts
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'create-inbox') {
      try {
        const response = await api.createQuickInbox();
        if (response.success && response.inbox) {
          const dashboard = await api.getDashboard();
          await storage.setInboxes(dashboard.inboxes);

          browser.notifications.create({
            type: 'basic',
            iconUrl: '/icons/icon128.png',
            title: 'Inbox Created',
            message: `Created ${response.inbox.localPart}@${response.inbox.domain}`
          });
        }
      } catch (error) {
        console.error('Failed to create inbox via shortcut:', error);
      }
    } else if (command === 'copy-current') {
      const result = await browser.storage.local.get('inboxes');
      const inboxes = (result.inboxes as any[]) || [];
      if (inboxes.length > 0) {
        const latest = inboxes[0];
        const email = latest.address || `${latest.localPart}@${typeof latest.domain === 'string' ? latest.domain : latest.domain.name}`;

        // Note: Clipboard access from background requires 'clipboardWrite' permission and activeTab or user interaction
        // Since shortcuts count as user interaction, this should work in most browsers,
        // but we might need to inject a script if background clipboard access is restricted.

        // Try background clipboard write first (Firefox/Chrome with permission)
        try {
           // @ts-ignore
           await navigator.clipboard.writeText(email);
           updateBadge('COPIED');
           setTimeout(() => updateBadge(undefined), 1500);
        } catch (e) {
           // Fallback: notify user
           browser.notifications.create({
            type: 'basic',
            iconUrl: '/icons/icon128.png',
            title: 'Latest Inbox',
            message: email
          });
        }
      }
    }
  });

  // Watch for storage changes to update context menus
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.inboxes) {
      setupContextMenus();
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
    if (message.type === 'AUTOMATION_CREATE_INBOX') {
      return createAutomationInbox()
        .then(async (inbox) => {
          const existing = await browser.storage.local.get(STORAGE_KEY_AUTOMATION_STATE);
          const state = existing[STORAGE_KEY_AUTOMATION_STATE] || {};
          await browser.storage.local.set({
            [STORAGE_KEY_AUTOMATION_STATE]: {
              ...state,
              latestEmail: inbox.email,
              latestInboxId: inbox.inboxId,
              latestInboxToken: inbox.inboxToken,
              emailCreatedAt: inbox.createdAt,
              updatedAt: Date.now(),
            },
          });
          return { success: true, inbox };
        })
        .catch((error) => ({ success: false, error: error.message }));
    }

    if (message.type === 'AUTOMATION_GET_LATEST_OTP') {
      const inboxToken = String(message.inboxToken || '');
      if (!inboxToken) return Promise.resolve({ success: false, error: 'Missing inbox token' });

      return pollLatestOtp({
        inboxToken,
        sinceTimestamp: Number(message.sinceTimestamp || 0),
        timeoutMs: Number(message.timeoutMs || 90000),
        pollIntervalMs: Number(message.pollIntervalMs || 2500),
        excludeMessageIds: Array.isArray(message.excludeMessageIds)
          ? message.excludeMessageIds.map((id: unknown) => String(id))
          : [],
      })
        .then((result) => {
          if (!result) return { success: false, error: 'OTP not found in time' };
          return { success: true, otp: result.code, receivedAt: result.receivedAt, messageId: result.messageId };
        })
        .catch((error) => ({ success: false, error: error.message }));
    }

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
      return setupPushNotificationWithRetry()
        .then(() => ({ success: true }))
        .catch(err => ({ success: false, error: err.message }));
    }

    if (message.type === 'TRACK_EVENT') {
      analytics.track(message.event, message.metadata);
      return Promise.resolve({ success: true });
    }
  });

  // Push Notification Setup with retry
  async function setupPushNotificationWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await setupPushNotification();
        return;
      } catch (err) {
        console.warn(`[Background] Push setup attempt ${i + 1} failed:`, err);
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
        }
      }
    }
    console.error('[Background] Push setup failed after retries');
  }

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

  // Sync data when back online
  self.addEventListener('online', async () => {
    console.log('[Background] Back online - syncing data');
    try {
      const auth = await storage.getAuth();
      if (auth.isAuthenticated) {
        const dashboard = await api.getDashboard();
        await storage.setInboxes(dashboard.inboxes);
      }
    } catch (e) {
      console.error('[Background] Sync failed:', e);
    }
  });
});
