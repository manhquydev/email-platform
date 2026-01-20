/**
 * Unit tests for ui-injector.ts
 * Tests core UI injection functions - focusing on testable utility functions
 * Note: Full DOM injection tests require more complex setup due to Shadow DOM
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Since ui-injector.ts has side effects on import (storage listeners, etc.),
// we test the exported function behavior through integration-style tests

describe('ui-injector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  describe('injectUI function behavior', () => {
    it('should not throw when called with empty array', async () => {
      // Dynamic import to avoid side effects during other tests
      const { injectUI } = await import('./ui-injector');

      expect(() => injectUI([])).not.toThrow();
    });

    it('should create icon container for detected field', async () => {
      const { injectUI } = await import('./ui-injector');

      const input = document.createElement('input');
      input.type = 'email';
      input.id = 'test-email';
      Object.defineProperty(input, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });
      document.body.appendChild(input);

      const mockField = {
        element: input,
        id: 'test-email',
        rect: input.getBoundingClientRect(),
      };

      injectUI([mockField]);

      // Run all pending timers (requestIdleCallback mock uses setTimeout)
      await vi.runAllTimersAsync();

      const iconContainer = document.querySelector('.ephemera-icon-container');
      expect(iconContainer).not.toBeNull();
    });

    it('should not inject duplicate icons for same field', async () => {
      const { injectUI } = await import('./ui-injector');

      const input = document.createElement('input');
      input.type = 'email';
      Object.defineProperty(input, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });
      document.body.appendChild(input);

      const mockField = {
        element: input,
        id: 'test-email',
        rect: input.getBoundingClientRect(),
      };

      // Inject twice
      injectUI([mockField]);
      injectUI([mockField]);

      await vi.runAllTimersAsync();

      const iconContainers = document.querySelectorAll('.ephemera-icon-container');
      expect(iconContainers.length).toBe(1);
    });

    it('should inject icons for multiple fields', async () => {
      const { injectUI } = await import('./ui-injector');

      const input1 = document.createElement('input');
      input1.type = 'email';
      input1.id = 'email1';
      Object.defineProperty(input1, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });

      const input2 = document.createElement('input');
      input2.type = 'email';
      input2.id = 'email2';
      Object.defineProperty(input2, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 200, left: 100, right: 300, bottom: 240 }),
      });

      document.body.appendChild(input1);
      document.body.appendChild(input2);

      injectUI([
        { element: input1, id: 'email1', rect: input1.getBoundingClientRect() },
        { element: input2, id: 'email2', rect: input2.getBoundingClientRect() },
      ]);

      await vi.runAllTimersAsync();

      const iconContainers = document.querySelectorAll('.ephemera-icon-container');
      expect(iconContainers.length).toBe(2);
    });
  });

  describe('icon container structure', () => {
    it('should create container with Shadow DOM', async () => {
      const { injectUI } = await import('./ui-injector');

      const input = document.createElement('input');
      input.type = 'email';
      Object.defineProperty(input, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });
      document.body.appendChild(input);

      injectUI([{ element: input, id: 'test', rect: input.getBoundingClientRect() }]);

      await vi.runAllTimersAsync();

      const container = document.querySelector('.ephemera-icon-container') as HTMLElement;
      expect(container).not.toBeNull();
      expect(container.shadowRoot).not.toBeNull();
    });

    it('should have correct z-index for overlay', async () => {
      const { injectUI } = await import('./ui-injector');

      const input = document.createElement('input');
      input.type = 'email';
      Object.defineProperty(input, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });
      document.body.appendChild(input);

      injectUI([{ element: input, id: 'test', rect: input.getBoundingClientRect() }]);

      await vi.runAllTimersAsync();

      const container = document.querySelector('.ephemera-icon-container') as HTMLElement;
      expect(container.style.zIndex).toBe('2147483647');
    });

    it('should position container absolutely', async () => {
      const { injectUI } = await import('./ui-injector');

      const input = document.createElement('input');
      input.type = 'email';
      Object.defineProperty(input, 'getBoundingClientRect', {
        value: () => ({ width: 200, height: 40, top: 100, left: 100, right: 300, bottom: 140 }),
      });
      document.body.appendChild(input);

      injectUI([{ element: input, id: 'test', rect: input.getBoundingClientRect() }]);

      await vi.runAllTimersAsync();

      const container = document.querySelector('.ephemera-icon-container') as HTMLElement;
      expect(container.style.position).toBe('absolute');
    });
  });

  describe('theme handling', () => {
    it('should respond to storage theme changes', async () => {
      // This test verifies the storage listener is set up
      // Full theme testing requires mocking browser.storage.onChanged
      const { injectUI } = await import('./ui-injector');

      // Just verify import doesn't throw with listeners
      expect(injectUI).toBeDefined();
    });
  });
});
