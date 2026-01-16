/**
 * Unit tests for API client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockApiResponse, mockApiError, resetFetchMock, mockFetch } from '../__tests__/mocks/fetch';
import { mockBrowser, mockStorageGet } from '../__tests__/mocks/browser';

// Mock config to use test URL
vi.mock('./config', () => ({
  CONFIG: {
    API_URL: 'https://test-api.example.com',
    WEB_URL: 'https://test-app.example.com',
    APP_NAME: 'Ephemera',
    VERSION: '0.1.0',
  },
}));

// Import api after mocking
import { api } from './api';

describe('ApiClient', () => {
  beforeEach(() => {
    resetFetchMock();
    vi.clearAllMocks();
    // Default: no auth token
    mockStorageGet({});
  });

  describe('login', () => {
    it('should call /auth/login with credentials', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: 'USER' };
      mockApiResponse({ token: 'jwt123', user: mockUser });

      const result = await api.login('test@test.com', 'password123');

      expect(result.token).toBe('jwt123');
      expect(result.user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
        })
      );
    });

    it('should handle 2FA requirement', async () => {
      mockApiResponse({ requires2FA: true, tempToken: 'temp123' });

      const result = await api.login('test@test.com', 'password');

      expect(result.requires2FA).toBe(true);
      expect(result.tempToken).toBe('temp123');
      expect(result.token).toBeUndefined();
    });

    it('should store auth on successful login', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: 'USER' };
      mockApiResponse({ token: 'jwt123', user: mockUser });

      await api.login('test@test.com', 'password');

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: expect.objectContaining({
          token: 'jwt123',
          user: mockUser,
          isAuthenticated: true,
        }),
      });
    });

    it('should throw error on failed login', async () => {
      // Use 400 instead of 401 to avoid token refresh logic
      mockApiError('Invalid credentials', 400);

      await expect(api.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA code and store auth', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: 'USER' };
      mockApiResponse({ token: 'jwt-after-2fa', user: mockUser });

      const result = await api.verify2FA('temp123', '123456');

      expect(result.token).toBe('jwt-after-2fa');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/auth/2fa/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tempToken: 'temp123', code: '123456' }),
        })
      );
    });
  });

  describe('getMe', () => {
    it('should fetch current user with auth header', async () => {
      mockStorageGet({ auth: { token: 'mytoken', isAuthenticated: true } });
      mockApiResponse({ user: { id: '1', email: 'test@test.com' } });

      const result = await api.getMe();

      expect(result.user.email).toBe('test@test.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
          }),
        })
      );
    });
  });

  describe('getDashboard', () => {
    it('should fetch extension dashboard data', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      const dashboardData = {
        user: { id: '1', tier: 'FREE' },
        stats: { totalInboxes: 5, totalUnread: 10 },
        inboxes: [],
      };
      mockApiResponse(dashboardData);

      const result = await api.getDashboard();

      expect(result.stats.totalInboxes).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/extension/dashboard',
        expect.any(Object)
      );
    });
  });

  describe('createQuickInbox', () => {
    it('should create a quick inbox', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({
        success: true,
        inbox: { id: 'inbox1', localPart: 'test123', domain: 'example.com' },
      });

      const result = await api.createQuickInbox();

      expect(result.success).toBe(true);
      expect(result.inbox.localPart).toBe('test123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/extension/quick-inbox',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('createCustomInbox', () => {
    it('should create inbox with custom local part', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({
        success: true,
        inbox: { id: 'inbox2', localPart: 'myprefix', domain: 'example.com' },
      });

      const result = await api.createCustomInbox('myprefix', 'domain-id-1');

      expect(result.inbox.localPart).toBe('myprefix');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/extension/quick-inbox',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ localPart: 'myprefix', domainId: 'domain-id-1' }),
        })
      );
    });
  });

  describe('updateInbox', () => {
    it('should update inbox expiration', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({ success: true });

      await api.updateInbox('inbox-123', { expiresAt: '2026-01-20T00:00:00Z' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/inboxes/inbox-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ expiresAt: '2026-01-20T00:00:00Z' }),
        })
      );
    });
  });

  describe('deleteInbox', () => {
    it('should delete an inbox', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({ success: true });

      await api.deleteInbox('inbox-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/inboxes/inbox-123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getDomains', () => {
    it('should fetch available domains', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({
        domains: [
          { id: 'd1', name: 'example.com', isPublic: true },
          { id: 'd2', name: 'test.io', isPublic: false },
        ],
      });

      const result = await api.getDomains();

      expect(result.domains).toHaveLength(2);
      expect(result.domains[0].name).toBe('example.com');
    });
  });

  describe('getMessages', () => {
    it('should fetch inbox messages with limit', async () => {
      mockStorageGet({ auth: { token: 'token', isAuthenticated: true } });
      mockApiResponse({
        data: [
          { id: 'm1', subject: 'Test Email', from: 'sender@test.com' },
        ],
      });

      const result = await api.getMessages('inbox-123', 5);

      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/inboxes/inbox-123/messages?limit=5',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should throw error with message from API', async () => {
      mockApiError('Rate limit exceeded', 429);

      await expect(api.getDashboard()).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getDashboard()).rejects.toThrow('Network error');
    });
  });
});
