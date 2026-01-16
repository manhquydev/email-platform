import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock crypto.randomUUID
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-1234-5678-9abc-def012345678',
    },
  });
}
