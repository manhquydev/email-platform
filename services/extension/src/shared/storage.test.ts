/**
 * Unit tests for storage utility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockBrowser, mockStorageGet, resetBrowserMocks } from '../__tests__/mocks/browser';
import { storage } from './storage';

describe('storage', () => {
  beforeEach(() => {
    resetBrowserMocks();
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when key not found', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const result = await storage.get('auth');

      expect(result).toBeNull();
    });

    it('should return stored value when key exists', async () => {
      const authData = { token: 'test-token', isAuthenticated: true };
      mockBrowser.storage.local.get.mockResolvedValue({ auth: authData });

      const result = await storage.get('auth');

      expect(result).toEqual(authData);
    });
  });

  describe('set', () => {
    it('should store value with key', async () => {
      const authData = { token: 'test-token', isAuthenticated: true };

      await storage.set('auth', authData as any);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: authData,
      });
    });
  });

  describe('remove', () => {
    it('should remove value by key', async () => {
      await storage.remove('auth');

      expect(mockBrowser.storage.local.remove).toHaveBeenCalledWith('auth');
    });
  });

  describe('getAuth', () => {
    it('should return default auth when no auth stored', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const auth = await storage.getAuth();

      expect(auth).toEqual({
        token: null,
        user: null,
        isAuthenticated: false,
        isAnonymous: false,
      });
    });

    it('should return stored auth data', async () => {
      const storedAuth = {
        token: 'jwt-token',
        user: { id: '1', email: 'test@test.com' },
        isAuthenticated: true,
        isAnonymous: false,
      };
      mockBrowser.storage.local.get.mockResolvedValue({ auth: storedAuth });

      const auth = await storage.getAuth();

      expect(auth).toEqual(storedAuth);
    });
  });

  describe('setAuth', () => {
    it('should store auth with isAuthenticated=true', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'USER' };

      await storage.setAuth('jwt-token', user);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: {
          token: 'jwt-token',
          user,
          isAuthenticated: true,
          isAnonymous: false,
        },
      });
    });

    it('should store auth with isAnonymous=true when specified', async () => {
      const user = { id: 'anonymous', email: 'anon@ephemera', role: 'USER' };

      await storage.setAuth('anon-token', user, true);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: {
          token: 'anon-token',
          user,
          isAuthenticated: true,
          isAnonymous: true,
        },
      });
    });
  });

  describe('clearAuth', () => {
    it('should reset auth to default values', async () => {
      await storage.clearAuth();

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: {
          token: null,
          user: null,
          isAuthenticated: false,
          isAnonymous: false,
        },
      });
    });
  });

  describe('getSettings', () => {
    it('should return default settings when none stored', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const settings = await storage.getSettings();

      expect(settings).toEqual({
        theme: 'light',
        autoCopy: true,
        notificationsEnabled: true,
      });
    });

    it('should return stored settings', async () => {
      const storedSettings = {
        theme: 'dark',
        autoCopy: false,
        notificationsEnabled: false,
      };
      mockBrowser.storage.local.get.mockResolvedValue({ settings: storedSettings });

      const settings = await storage.getSettings();

      expect(settings).toEqual(storedSettings);
    });
  });

  describe('updateSettings', () => {
    it('should merge updates with existing settings', async () => {
      const existingSettings = {
        theme: 'light',
        autoCopy: true,
        notificationsEnabled: true,
      };
      mockBrowser.storage.local.get.mockResolvedValue({ settings: existingSettings });

      await storage.updateSettings({ theme: 'dark' });

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        settings: {
          theme: 'dark',
          autoCopy: true,
          notificationsEnabled: true,
        },
      });
    });
  });

  describe('getDeviceId', () => {
    it('should return existing device ID', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({ deviceId: 'existing-device-id' });

      const deviceId = await storage.getDeviceId();

      expect(deviceId).toBe('existing-device-id');
    });

    it('should generate and store new device ID when none exists', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const deviceId = await storage.getDeviceId();

      expect(deviceId).toBeTruthy();
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        deviceId: expect.any(String),
      });
    });
  });

  describe('setInboxes', () => {
    it('should store normalized inboxes', async () => {
      const inboxes = [
        { id: '1', localPart: 'test', domain: 'example.com' },
      ];

      await storage.setInboxes(inboxes);

      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });

    it('should broadcast INBOXES_UPDATED message', async () => {
      const inboxes = [{ id: '1', localPart: 'test', domain: 'example.com' }];

      await storage.setInboxes(inboxes);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INBOXES_UPDATED' })
      );
    });
  });
});
