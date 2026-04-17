import { storage } from '../shared/storage';
import { api } from '../shared/api';
import { analytics } from '../shared/analytics';
import { handlePushMessage, handleNotificationClick, updateBadge } from '../background/push-handler';
import { createAutomationInbox, pollLatestLink, pollLatestOtp } from '../background/openai-auth-automation-service';
import { initNetworkInterceptor, getCapturedData, clearCapturedData } from '../background/network-interceptor';
import browser from 'webextension-polyfill';

export default defineBackground(() => {
  // Initialize network interceptor for OpenAI auth flow analysis
  initNetworkInterceptor();

  type ContextMenuCreateProperties = Parameters<typeof browser.contextMenus.create>[0];
  const msg = (key: string, fallback: string, substitutions?: string[]) => {
    const value = browser.i18n.getMessage(key, substitutions);
    return value || fallback;
  };
  const isUnauthorizedError = (error: unknown): boolean => {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /\bunauthorized\b|401/i.test(text);
  };
  const isDuplicateMenuError = (error: unknown): boolean => {
    const text = error instanceof Error ? error.message : String(error ?? '');
    return /duplicate id/i.test(text);
  };

  // Alarm names
  const ALARM_POLL_MESSAGES = 'poll_messages';
  const STORAGE_KEY_LAST_MESSAGE_ID = 'last_message_id';
  const STORAGE_KEY_AUTOMATION_STATE = 'openai_auth_automation_state';
  const STORAGE_KEY_FIREWORKS_FLOW3_STATE = 'fireworks_flow3_automation_state';
  const STORAGE_KEY_AUTOMATION_TEST_MOCKS = 'automation_test_mocks';
  let contextMenuRefreshQueue: Promise<void> = Promise.resolve();
  const TEMPORARY_INBOX_MS = 24 * 60 * 60 * 1000;

  interface AutomationMockCreateInbox {
    inboxId: string;
    inboxToken?: string;
    email: string;
    createdAt?: number;
  }

  interface AutomationMockLink {
    url: string;
    messageId?: string;
    receivedAt?: number;
  }

  interface AutomationMockOtp {
    code: string;
    messageId?: string;
    receivedAt?: number;
  }

  interface AutomationTestMocks {
    enabled?: boolean;
    createInboxQueue?: AutomationMockCreateInbox[];
    latestConfirmationLinkQueue?: AutomationMockLink[];
    latestOtpQueue?: AutomationMockOtp[];
    updatedAt?: number;
  }

  async function readAutomationTestMocks(): Promise<AutomationTestMocks> {
    const result = await browser.storage.local.get(STORAGE_KEY_AUTOMATION_TEST_MOCKS);
    return (result[STORAGE_KEY_AUTOMATION_TEST_MOCKS] as AutomationTestMocks) || {};
  }

  async function writeAutomationTestMocks(state: AutomationTestMocks): Promise<void> {
    await browser.storage.local.set({
      [STORAGE_KEY_AUTOMATION_TEST_MOCKS]: {
        ...state,
        updatedAt: Date.now(),
      },
    });
  }

  async function consumeMockCreateInbox(): Promise<AutomationMockCreateInbox | null> {
    const state = await readAutomationTestMocks();
    if (!state.enabled) return null;
    const queue = Array.isArray(state.createInboxQueue) ? state.createInboxQueue : [];
    if (queue.length === 0) return null;
    const [first, ...rest] = queue;
    await writeAutomationTestMocks({ ...state, createInboxQueue: rest });
    return first || null;
  }

  async function consumeMockLatestConfirmationLink(): Promise<AutomationMockLink | null> {
    const state = await readAutomationTestMocks();
    if (!state.enabled) return null;
    const queue = Array.isArray(state.latestConfirmationLinkQueue) ? state.latestConfirmationLinkQueue : [];
    if (queue.length === 0) return null;
    const [first, ...rest] = queue;
    await writeAutomationTestMocks({ ...state, latestConfirmationLinkQueue: rest });
    return first || null;
  }

  async function consumeMockLatestOtp(): Promise<AutomationMockOtp | null> {
    const state = await readAutomationTestMocks();
    if (!state.enabled) return null;
    const queue = Array.isArray(state.latestOtpQueue) ? state.latestOtpQueue : [];
    if (queue.length === 0) return null;
    const [first, ...rest] = queue;
    await writeAutomationTestMocks({ ...state, latestOtpQueue: rest });
    return first || null;
  }

  async function getAllowedDomainIdsFromSettings(): Promise<string[]> {
    const settings = await storage.getSettings();
    return settings.automationAllowedDomainIds || [];
  }

  async function applyDefaultInboxLifetime(inbox: {
    id?: string;
    expiresAt?: string | null;
    address?: string;
    localPart?: string;
    domain?: string | { name?: string };
  }) {
    if (!inbox?.id) return inbox;

    const settings = await storage.getSettings();
    const lifetime = settings.defaultInboxLifetime || 'temporary';
    const currentExpiresAt = inbox.expiresAt ?? null;

    if (lifetime === 'permanent' && currentExpiresAt !== null) {
      await api.updateInbox(inbox.id, { expiresAt: null });
      return { ...inbox, expiresAt: null };
    }

    if (lifetime === 'temporary' && currentExpiresAt === null) {
      const expiresAt = new Date(Date.now() + TEMPORARY_INBOX_MS).toISOString();
      await api.updateInbox(inbox.id, { expiresAt });
      return { ...inbox, expiresAt };
    }

    return inbox;
  }

  async function createContextMenuItem(properties: ContextMenuCreateProperties): Promise<void> {
    try {
      await browser.contextMenus.create(properties);
    } catch (error) {
      if (isDuplicateMenuError(error)) {
        return;
      }
      throw error;
    }
  }

  function queueContextMenuRefresh(): Promise<void> {
    contextMenuRefreshQueue = contextMenuRefreshQueue
      .catch(() => undefined)
      .then(async () => {
        await setupContextMenus();
      });
    return contextMenuRefreshQueue;
  }

  async function toggleOpenAiFlow1Loop(trigger: 'command' | 'message' = 'command'): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
    try {
      const existing = await browser.storage.local.get(STORAGE_KEY_AUTOMATION_STATE);
      const state = (existing[STORAGE_KEY_AUTOMATION_STATE] as Record<string, any>) || {};
      const enabled = !Boolean(state.flow1LoopEnabled);
      const nextState = {
        ...state,
        flow1LoopEnabled: enabled,
        flow1AwaitingOnboarding: false,
        flow1PendingLogoutAt: undefined,
        activeFlow1CredentialId: undefined,
        flow2ActiveCredentialId: undefined,
        updatedAt: Date.now(),
      };

      await browser.storage.local.set({
        [STORAGE_KEY_AUTOMATION_STATE]: nextState,
      });

      if (enabled) {
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id) {
          await browser.tabs.update(tab.id, { url: 'https://chatgpt.com/' });
        } else {
          await browser.tabs.create({ url: 'https://chatgpt.com/' });
        }
      }

      await browser.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: enabled ? 'OpenAI Flow 1 Started' : 'OpenAI Flow 1 Stopped',
        message: enabled
          ? `Loop automation is ON (${trigger}). Press Ctrl+Shift+8 again to stop.`
          : 'Loop automation is OFF.',
      });

      return { success: true, enabled };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to toggle OpenAI Flow 1 loop:', error);
      return { success: false, error: message };
    }
  }

  async function toggleFireworksFlow3Loop(trigger: 'command' | 'message' = 'command'): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
    try {
      const existing = await browser.storage.local.get(STORAGE_KEY_FIREWORKS_FLOW3_STATE);
      const state = (existing[STORAGE_KEY_FIREWORKS_FLOW3_STATE] as Record<string, any>) || {};
      const enabled = !Boolean(state.flow3LoopEnabled);
      const nextState = {
        ...state,
        flow3LoopEnabled: enabled,
        updatedAt: Date.now(),
      };

      await browser.storage.local.set({
        [STORAGE_KEY_FIREWORKS_FLOW3_STATE]: nextState,
      });

      if (enabled) {
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id) {
          await browser.tabs.update(tab.id, { url: 'https://app.fireworks.ai/signup' });
        } else {
          await browser.tabs.create({ url: 'https://app.fireworks.ai/signup' });
        }
      }

      await browser.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: enabled ? 'Fireworks Flow 3 Started' : 'Fireworks Flow 3 Stopped',
        message: enabled
          ? `Loop automation is ON (${trigger}). Press Ctrl+Shift+9 again to stop.`
          : 'Loop automation is OFF.',
      });

      return { success: true, enabled };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to toggle Fireworks Flow 3 loop:', error);
      return { success: false, error: message };
    }
  }

  // Setup alarms and context menus on install
  browser.runtime.onInstalled.addListener(async () => {
    console.log('Ephemera Extension Installed');

    // Setup initial context menus
    await queueContextMenuRefresh();

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

    await queueContextMenuRefresh();
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
        if (isUnauthorizedError(e)) {
          await storage.clearAuth();
          updateBadge('');
          console.warn('[Background] Poll stopped: auth expired');
          return;
        }
        console.error('[Background] Poll failed:', e);
      }
    }
  });

  // Listen for keyboard shortcuts
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'create-inbox') {
      try {
        const allowedDomainIds = await getAllowedDomainIdsFromSettings();
        const response = await api.createQuickInbox({ allowedDomainIds });
        if (response.success && response.inbox) {
          await applyDefaultInboxLifetime(response.inbox);
          const dashboard = await api.getDashboard();
          await storage.setInboxes(dashboard.inboxes);

          browser.notifications.create({
            type: 'basic',
            iconUrl: '/icons/icon128.png',
            title: msg('bgInboxCreatedTitle', 'Inbox Created'),
            message: msg('bgInboxCreatedMessage', 'Created $1', [`${response.inbox.localPart}@${response.inbox.domain}`])
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
            title: msg('bgLatestInboxTitle', 'Latest Inbox'),
            message: email
          });
        }
      }
    } else if (command === 'toggle-openai-flow1-loop') {
      await toggleOpenAiFlow1Loop('command');
    } else if (command === 'toggle-fireworks-flow3-loop') {
      await toggleFireworksFlow3Loop('command');
    }
  });

  // Watch for storage changes to update context menus
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.inboxes) {
      void queueContextMenuRefresh().catch((error) => {
        console.warn('[Background] Failed to refresh context menus:', error);
      });
    }
  });

  async function setupContextMenus() {
    await browser.contextMenus.removeAll();

    // Parent Menu
    await createContextMenuItem({
      id: 'ephemera-parent',
      title: msg('bgContextParent', 'Ephemera'),
      contexts: ['editable'],
    });

    // Quick Actions
    await createContextMenuItem({
      id: 'generate-new',
      parentId: 'ephemera-parent',
      title: msg('generateNew', 'Generate New Email'),
      contexts: ['editable'],
    });

    await createContextMenuItem({
      id: 'sep-1',
      parentId: 'ephemera-parent',
      type: 'separator',
      contexts: ['editable'],
    });

    // Existing Inboxes (will be populated dynamically)
    const result = await browser.storage.local.get('inboxes');
    const inboxes = (result.inboxes as any[]) || [];
    if (inboxes.length === 0) {
      await createContextMenuItem({
        id: 'no-inboxes',
        parentId: 'ephemera-parent',
        title: msg('bgNoActiveInboxes', 'No active inboxes'),
        enabled: false,
        contexts: ['editable'],
      });
    } else {
      for (const inbox of inboxes.slice(0, 8)) {
        const email = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : inbox.domain.name}`;
        await createContextMenuItem({
          id: `fill-${inbox.id}`,
          parentId: 'ephemera-parent',
          title: email,
          contexts: ['editable'],
        });
      }
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
          title: msg('signInRequired', 'Sign in Required'),
          message: msg('signInRequiredDesc', 'Please sign in to your Ephemera account to use this feature.'),
        });
        return;
      }

      let emailToFill = '';

      if (info.menuItemId === 'generate-new') {
        const allowedDomainIds = await getAllowedDomainIdsFromSettings();
        const response = await api.createQuickInbox({ allowedDomainIds });
        if (response.success && response.inbox) {
          analytics.track('inbox_created_quick', { context: 'context_menu' });
          const inbox = await applyDefaultInboxLifetime(response.inbox);
          emailToFill = inbox.address || `${inbox.localPart}@${typeof inbox.domain === 'string' ? inbox.domain : (inbox.domain?.name || 'domain')}`;

          // Sync and refresh menus
          const dashboard = await api.getDashboard();
          await storage.setInboxes(dashboard.inboxes);
          await queueContextMenuRefresh();
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
      return consumeMockCreateInbox()
        .then((mocked) => {
          if (mocked) {
            return {
              inboxId: mocked.inboxId,
              inboxToken: mocked.inboxToken,
              email: mocked.email,
              createdAt: mocked.createdAt || Date.now(),
            };
          }

          return Promise.all([storage.getSettings(), storage.getAuth()])
            .then(async ([settings, auth]) => {
              const lifetime = settings.defaultInboxLifetime || 'temporary';
              const allowedDomainIds = settings.automationAllowedDomainIds || [];

              if (auth?.isAuthenticated && !auth?.isAnonymous && auth?.token) {
                const automationExpiryHours = Number(settings.automationExpiryHours || 2);
                const boundedHours = Math.max(1, Math.min(24, Number.isFinite(automationExpiryHours) ? automationExpiryHours : 2));
                const expiresAt = lifetime === 'permanent'
                  ? null
                  : new Date(Date.now() + boundedHours * 60 * 60 * 1000).toISOString();

                const response = await api.createQuickInbox({
                  allowedDomainIds,
                  expiresAt,
                });
                const inbox = response?.inbox;
                if (!response?.success || !inbox?.id) {
                  throw new Error('Failed to create authenticated automation inbox');
                }

                const domainName = typeof inbox.domain === 'string' ? inbox.domain : (inbox.domain?.name || '');
                const email = inbox.address || `${inbox.localPart}@${domainName}`;
                return {
                  inboxId: inbox.id,
                  inboxToken: undefined,
                  email,
                  createdAt: Date.now(),
                };
              }

              const expiryHours = lifetime === 'temporary' ? settings.automationExpiryHours : undefined;
              return createAutomationInbox({
                expiryHours,
                allowedDomainIds,
                accessToken: auth?.token ?? null,
              });
            });
        })
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
      const inboxId = String(message.inboxId || '');
      if (!inboxToken && !inboxId) {
        return Promise.resolve({ success: false, error: 'Missing inbox token or inbox id' });
      }

      return consumeMockLatestOtp()
        .then((mocked) => {
          if (mocked) {
            return {
              code: mocked.code,
              messageId: mocked.messageId || `mock-otp-${Date.now()}`,
              receivedAt: mocked.receivedAt || Date.now(),
            };
          }

          return storage.getAuth()
            .then((auth) => pollLatestOtp({
              inboxToken: inboxToken || undefined,
              inboxId: inboxId || undefined,
              accessToken: auth?.token || null,
              sinceTimestamp: Number(message.sinceTimestamp || 0),
              timeoutMs: Number(message.timeoutMs || 90000),
              pollIntervalMs: Number(message.pollIntervalMs || 2500),
              excludeMessageIds: Array.isArray(message.excludeMessageIds)
                ? message.excludeMessageIds.map((id: unknown) => String(id))
                : [],
            }));
        })
        .then((result) => {
          if (!result) return { success: false, error: 'OTP not found in time' };
          return { success: true, otp: result.code, receivedAt: result.receivedAt, messageId: result.messageId };
        })
        .catch((error) => ({ success: false, error: error.message }));
    }

    if (message.type === 'AUTOMATION_GET_LATEST_CONFIRMATION_LINK') {
      const inboxToken = String(message.inboxToken || '');
      const inboxId = String(message.inboxId || '');
      if (!inboxToken && !inboxId) {
        return Promise.resolve({ success: false, error: 'Missing inbox token or inbox id' });
      }

      return consumeMockLatestConfirmationLink()
        .then((mocked) => {
          if (mocked) {
            return {
              url: mocked.url,
              messageId: mocked.messageId || `mock-confirm-${Date.now()}`,
              receivedAt: mocked.receivedAt || Date.now(),
            };
          }

          return storage.getAuth()
            .then((auth) => pollLatestLink({
              inboxToken: inboxToken || undefined,
              inboxId: inboxId || undefined,
              accessToken: auth?.token || null,
              sinceTimestamp: Number(message.sinceTimestamp || 0),
              timeoutMs: Number(message.timeoutMs || 120000),
              pollIntervalMs: Number(message.pollIntervalMs || 2500),
              excludeMessageIds: Array.isArray(message.excludeMessageIds)
                ? message.excludeMessageIds.map((id: unknown) => String(id))
                : [],
              urlPattern: typeof message.urlPattern === 'string' ? message.urlPattern : undefined,
            }));
        })
        .then((result) => {
          if (!result) return { success: false, error: 'Confirmation link not found in time' };
          return {
            success: true,
            url: result.url,
            receivedAt: result.receivedAt,
            messageId: result.messageId,
          };
        })
        .catch((error) => ({ success: false, error: error.message }));
    }

    if (message.type === 'AUTOMATION_NOTIFY') {
      const title = typeof message.title === 'string' && message.title.trim()
        ? message.title.trim()
        : 'OpenAI Automation';
      const notifyMessage = typeof message.message === 'string' && message.message.trim()
        ? message.message.trim()
        : 'Automation event';

      return browser.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title,
        message: notifyMessage,
      })
        .then(() => ({ success: true }))
        .catch((error) => ({ success: false, error: error?.message || String(error) }));
    }

    if (message.type === 'AUTOMATION_TOGGLE_FLOW1_LOOP') {
      return toggleOpenAiFlow1Loop('message');
    }

    if (message.type === 'AUTOMATION_TOGGLE_FIREWORKS_FLOW3_LOOP') {
      return toggleFireworksFlow3Loop('message');
    }

    if (message.type === 'CREATE_INBOX') {
      analytics.track('inbox_created_quick', { context: 'content_script_dropdown' });
      return getAllowedDomainIdsFromSettings()
        .then((allowedDomainIds) => api.createQuickInbox({ allowedDomainIds }))
        .then(async response => {
          if (response.success && response.inbox) {
              await applyDefaultInboxLifetime(response.inbox);
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

    // Network interceptor message handlers
    if (message.type === 'NETWORK_GET_CAPTURED_DATA') {
      return Promise.resolve({
        success: true,
        data: getCapturedData(),
      });
    }

    if (message.type === 'NETWORK_CLEAR_CAPTURED_DATA') {
      clearCapturedData();
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
      if (isUnauthorizedError(e)) {
        await storage.clearAuth();
        updateBadge('');
        console.warn('[Background] Sync skipped: auth expired');
        return;
      }
      console.error('[Background] Sync failed:', e);
    }
  });
});
