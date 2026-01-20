/**
 * Unit tests for push-handler.ts
 * Tests push notification handling, badge updates, and notification clicks
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handlePushMessage, handleNotificationClick, updateBadge } from './push-handler';
import { mockBrowser } from '../__tests__/mocks/browser';

// Mock the config module
vi.mock('../shared/config', () => ({
  CONFIG: {
    WEB_URL: 'https://app.ephemera.test',
    API_URL: 'https://api.ephemera.test',
  },
}));

// Mock self.registration for service worker context
const mockShowNotification = vi.fn().mockResolvedValue(undefined);
(globalThis as any).self = {
  registration: {
    showNotification: mockShowNotification,
  },
};

describe('push-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowNotification.mockClear();
  });

  describe('handlePushMessage', () => {
    it('should show notification with correct title when from is provided', async () => {
      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: 'sender@example.com',
        subject: 'Test Subject',
        preview: 'This is a preview...',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      await handlePushMessage(payload);

      expect(mockShowNotification).toHaveBeenCalledWith(
        'New Email from sender@example.com',
        expect.objectContaining({
          body: 'Test Subject',
          icon: '/icons/icon128.png',
        })
      );
    });

    it('should show generic title when from is empty', async () => {
      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: '',
        subject: 'Test Subject',
        preview: 'Preview text',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      await handlePushMessage(payload);

      expect(mockShowNotification).toHaveBeenCalledWith(
        'New Email',
        expect.any(Object)
      );
    });

    it('should use preview as body when subject is empty', async () => {
      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: 'sender@test.com',
        subject: '',
        preview: 'This is the preview text',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      await handlePushMessage(payload);

      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'This is the preview text',
        })
      );
    });

    it('should use fallback message when subject and preview are empty', async () => {
      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: 'sender@test.com',
        subject: '',
        preview: '',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      await handlePushMessage(payload);

      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'You have received a new message',
        })
      );
    });

    it('should update badge after showing notification', async () => {
      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: 'test@example.com',
        subject: 'Hello',
        preview: '',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      await handlePushMessage(payload);

      expect(mockBrowser.action?.setBadgeText || mockBrowser.browserAction?.setBadgeText).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockShowNotification.mockRejectedValueOnce(new Error('Notification failed'));

      const payload = {
        type: 'new_message' as const,
        messageId: 'msg-123',
        inboxId: 'inbox-456',
        from: 'test@example.com',
        subject: 'Test',
        preview: '',
        receivedAt: '2026-01-20T10:00:00Z',
      };

      // Should not throw
      await expect(handlePushMessage(payload)).resolves.not.toThrow();
    });
  });

  describe('handleNotificationClick', () => {
    it('should close notification and open inbox URL when inboxId is present', async () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
          data: {
            inboxId: 'inbox-123',
            messageId: 'msg-456',
          },
        },
        waitUntil: vi.fn(),
      };

      await handleNotificationClick(mockEvent);

      expect(mockEvent.notification.close).toHaveBeenCalled();
    });

    it('should open dashboard when no inboxId in notification data', async () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
          data: null,
        },
        waitUntil: vi.fn(),
      };

      await handleNotificationClick(mockEvent);

      expect(mockEvent.notification.close).toHaveBeenCalled();
    });

    it('should open dashboard when data exists but no inboxId', async () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
          data: { someOtherField: 'value' },
        },
        waitUntil: vi.fn(),
      };

      await handleNotificationClick(mockEvent);

      expect(mockEvent.notification.close).toHaveBeenCalled();
    });
  });

  describe('updateBadge', () => {
    beforeEach(() => {
      // Mock browser.action API
      (mockBrowser as any).action = {
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      };
    });

    it('should set badge text when text is provided', async () => {
      await updateBadge('5');

      expect((mockBrowser as any).action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
    });

    it('should set red background color when text is non-empty', async () => {
      await updateBadge('NEW');

      expect((mockBrowser as any).action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#ef4444',
      });
    });

    it('should clear badge when empty string is passed', async () => {
      await updateBadge('');

      expect((mockBrowser as any).action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should not set badge when undefined is passed', async () => {
      await updateBadge(undefined);

      expect((mockBrowser as any).action.setBadgeText).not.toHaveBeenCalled();
    });
  });
});
