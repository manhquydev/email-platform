/**
 * Mock for webextension-polyfill browser API
 * Used in unit tests to isolate browser extension APIs
 */
import { vi } from 'vitest';

/** Mock translations for testing - matches _locales/en/messages.json */
const mockMessages: Record<string, string> = {
  extName: 'Ephemera - Temporary Email',
  extDescription: 'Create disposable email addresses instantly. Protect your privacy and avoid spam.',
  signIn: 'Sign In',
  email: 'Email',
  emailAddress: 'Email Address',
  password: 'Password',
  loginFailed: 'Login failed',
  activeInboxes: 'Active Inboxes',
  createNewInbox: 'Create New Inbox',
  generateNew: 'Generate New Email',
  copied: 'Copied!',
  viewMessages: 'View Messages',
  dashboard: 'Dashboard',
  settings: 'Settings',
  logout: 'Log Out',
  noInboxes: 'No inboxes yet',
  createFirstInbox: 'Create your first inbox',
  loading: 'Loading...',
  signInRequired: 'Sign in Required',
  signInRequiredDesc: 'Please sign in to your Ephemera account to use temporary emails.',
  goAnonymous: 'Go Anonymous',
  secureEntry: 'Secure Entry',
  newToEphemera: 'New to Ephemera?',
  createAccount: 'Create Account',
  securityCheck: 'Security Check',
  verifyAndContinue: 'Verify & Continue',
  backToLogin: 'Back to Login',
  expired: 'Expired',
  refresh: 'Refresh',
};

export const mockBrowser = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn().mockResolvedValue(undefined),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key: string) => mockMessages[key] || key),
    getUILanguage: vi.fn(() => 'en'),
  },
  action: {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setIcon: vi.fn().mockResolvedValue(undefined),
  },
  browserAction: {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setIcon: vi.fn().mockResolvedValue(undefined),
  },
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    query: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
  },
};

/**
 * Reset all mock functions to their initial state
 */
export function resetBrowserMocks() {
  Object.values(mockBrowser.storage.local).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockClear();
    }
  });
  mockBrowser.storage.local.get.mockResolvedValue({});
  mockBrowser.storage.local.set.mockResolvedValue(undefined);
  mockBrowser.storage.local.remove.mockResolvedValue(undefined);
  mockBrowser.runtime.sendMessage.mockResolvedValue(undefined);
}

/**
 * Helper to mock storage.local.get with specific data
 */
export function mockStorageGet(data: Record<string, unknown>) {
  mockBrowser.storage.local.get.mockImplementation((keys) => {
    if (typeof keys === 'string') {
      return Promise.resolve({ [keys]: data[keys] });
    }
    if (Array.isArray(keys)) {
      const result: Record<string, unknown> = {};
      keys.forEach((key) => {
        if (key in data) result[key] = data[key];
      });
      return Promise.resolve(result);
    }
    return Promise.resolve(data);
  });
}
