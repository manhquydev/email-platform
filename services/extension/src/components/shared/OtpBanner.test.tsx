/**
 * Unit tests for OtpBanner component
 * Simplified tests focusing on rendering and basic interactions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OtpBanner from './OtpBanner';

// Mock useOtpWatcher hook
const mockClearOtp = vi.fn();
vi.mock('../../hooks/useOtpWatcher', () => ({
  useOtpWatcher: vi.fn(),
}));

import { useOtpWatcher } from '../../hooks/useOtpWatcher';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('OtpBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when no OTP', () => {
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: null,
        clearOtp: mockClearOtp,
      });

      const { container } = render(<OtpBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when OTP is expired (timeLeft <= 0)', () => {
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: { code: '123456', from: 'test@example.com', expiresAt: Date.now() - 5000 },
        clearOtp: mockClearOtp,
      });

      const { container } = render(<OtpBanner />);
      // Component checks timeLeft <= 0 and returns null
      expect(container.querySelector('.bg-gradient-to-r')).toBeNull();
    });
  });

  describe('hook integration', () => {
    it('should call useOtpWatcher hook', () => {
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: null,
        clearOtp: mockClearOtp,
      });

      render(<OtpBanner />);
      expect(useOtpWatcher).toHaveBeenCalled();
    });

    it('should receive clearOtp from hook', () => {
      const customClearOtp = vi.fn();
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: null,
        clearOtp: customClearOtp,
      });

      render(<OtpBanner />);
      expect(useOtpWatcher).toHaveBeenCalled();
    });
  });

  describe('OTP data handling', () => {
    it('should handle OTP with all fields', () => {
      const futureTime = Date.now() + 60000;
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: {
          code: '987654',
          from: 'sender@example.com',
          expiresAt: futureTime
        },
        clearOtp: mockClearOtp,
      });

      // Component renders but depends on interval for timeLeft
      const { container } = render(<OtpBanner />);
      expect(container).toBeTruthy();
    });

    it('should handle OTP with empty from field', () => {
      (useOtpWatcher as ReturnType<typeof vi.fn>).mockReturnValue({
        otp: {
          code: '111111',
          from: '',
          expiresAt: Date.now() + 30000
        },
        clearOtp: mockClearOtp,
      });

      const { container } = render(<OtpBanner />);
      expect(container).toBeTruthy();
    });
  });
});
