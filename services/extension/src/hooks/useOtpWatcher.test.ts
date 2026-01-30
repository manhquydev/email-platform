/**
 * Unit tests for useOtpWatcher hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOtpWatcher } from './useOtpWatcher';

// Mock webextension-polyfill
const mockStorageListeners: ((changes: any, area: string) => void)[] = [];

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      session: {
        get: vi.fn(),
        remove: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn((listener) => {
          mockStorageListeners.push(listener);
        }),
        removeListener: vi.fn((listener) => {
          const index = mockStorageListeners.indexOf(listener);
          if (index > -1) mockStorageListeners.splice(index, 1);
        }),
      },
    },
  },
}));

import browser from 'webextension-polyfill';

describe('useOtpWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageListeners.length = 0;
    (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (browser.storage.session.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('should return null otp initially when no stored OTP', async () => {
      (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useOtpWatcher());

      await waitFor(() => {
        expect(result.current.otp).toBeNull();
      });
    });

    it('should return stored OTP on mount', async () => {
      const storedOtp = {
        code: '123456',
        from: 'test@example.com',
        expiresAt: Date.now() + 60000,
      };
      (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        latest_otp: storedOtp,
      });

      const { result } = renderHook(() => useOtpWatcher());

      await waitFor(() => {
        expect(result.current.otp).toEqual(storedOtp);
      });
    });
  });

  describe('storage listener', () => {
    it('should add storage listener on mount', () => {
      renderHook(() => useOtpWatcher());

      expect(browser.storage.onChanged.addListener).toHaveBeenCalled();
      expect(mockStorageListeners.length).toBe(1);
    });

    it('should remove storage listener on unmount', () => {
      const { unmount } = renderHook(() => useOtpWatcher());

      unmount();

      expect(browser.storage.onChanged.removeListener).toHaveBeenCalled();
    });

    it('should update otp when storage changes', async () => {
      (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useOtpWatcher());

      const newOtp = {
        code: '654321',
        from: 'sender@test.com',
        expiresAt: Date.now() + 30000,
      };

      // Simulate storage change
      act(() => {
        mockStorageListeners.forEach((listener) => {
          listener({ latest_otp: { newValue: newOtp } }, 'session');
        });
      });

      await waitFor(() => {
        expect(result.current.otp).toEqual(newOtp);
      });
    });

    it('should ignore changes from non-session storage', async () => {
      (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useOtpWatcher());

      const newOtp = { code: '111222', from: 'test@test.com', expiresAt: Date.now() + 30000 };

      // Simulate change from local storage (should be ignored)
      act(() => {
        mockStorageListeners.forEach((listener) => {
          listener({ latest_otp: { newValue: newOtp } }, 'local');
        });
      });

      await waitFor(() => {
        expect(result.current.otp).toBeNull();
      });
    });
  });

  describe('clearOtp', () => {
    it('should clear OTP from storage and state', async () => {
      const storedOtp = {
        code: '123456',
        from: 'test@example.com',
        expiresAt: Date.now() + 60000,
      };
      (browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        latest_otp: storedOtp,
      });

      const { result } = renderHook(() => useOtpWatcher());

      await waitFor(() => {
        expect(result.current.otp).toEqual(storedOtp);
      });

      await act(async () => {
        await result.current.clearOtp();
      });

      expect(browser.storage.session.remove).toHaveBeenCalledWith('latest_otp');
      expect(result.current.otp).toBeNull();
    });
  });
});
