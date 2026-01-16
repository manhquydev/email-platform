import { describe, it, expect } from 'vitest';
import {
  COUNTDOWN_INTERVAL_MS,
  DEBOUNCE_DELAY_MS,
  TIER_LIMITS,
  MAX_CONTEXT_MENU_INBOXES,
  EXPIRY_WARNING_MS,
  RETRY_CONFIG,
  ANIMATION,
} from './constants';

describe('constants', () => {
  describe('timing constants', () => {
    it('COUNTDOWN_INTERVAL_MS should be 1 second', () => {
      expect(COUNTDOWN_INTERVAL_MS).toBe(1000);
    });

    it('DEBOUNCE_DELAY_MS should be reasonable', () => {
      expect(DEBOUNCE_DELAY_MS).toBeGreaterThan(0);
      expect(DEBOUNCE_DELAY_MS).toBeLessThan(1000);
    });

    it('EXPIRY_WARNING_MS should be 5 minutes', () => {
      expect(EXPIRY_WARNING_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('tier limits', () => {
    it('should have correct tier structure', () => {
      expect(TIER_LIMITS).toHaveProperty('FREE');
      expect(TIER_LIMITS).toHaveProperty('STARTER');
      expect(TIER_LIMITS).toHaveProperty('PRO');
    });

    it('tier limits should increase progressively', () => {
      expect(TIER_LIMITS.FREE).toBeLessThan(TIER_LIMITS.STARTER);
      expect(TIER_LIMITS.STARTER).toBeLessThan(TIER_LIMITS.PRO);
    });

    it('FREE tier should have minimal inboxes', () => {
      expect(TIER_LIMITS.FREE).toBe(5);
    });
  });

  describe('UI constants', () => {
    it('MAX_CONTEXT_MENU_INBOXES should be reasonable', () => {
      expect(MAX_CONTEXT_MENU_INBOXES).toBeGreaterThanOrEqual(5);
      expect(MAX_CONTEXT_MENU_INBOXES).toBeLessThanOrEqual(20);
    });
  });

  describe('retry configuration', () => {
    it('should have valid retry config', () => {
      expect(RETRY_CONFIG.maxAttempts).toBeGreaterThan(0);
      expect(RETRY_CONFIG.baseDelayMs).toBeGreaterThan(0);
      expect(RETRY_CONFIG.maxDelayMs).toBeGreaterThan(RETRY_CONFIG.baseDelayMs);
    });
  });

  describe('animation durations', () => {
    it('should have increasing animation speeds', () => {
      expect(ANIMATION.fast).toBeLessThan(ANIMATION.normal);
      expect(ANIMATION.normal).toBeLessThan(ANIMATION.slow);
    });

    it('animations should be reasonable durations', () => {
      expect(ANIMATION.fast).toBeGreaterThanOrEqual(100);
      expect(ANIMATION.slow).toBeLessThanOrEqual(1000);
    });
  });
});
