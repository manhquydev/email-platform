---
parent: ./plan.md
phase: 01
title: Unit Testing for Components & API
---

# Phase 01: Unit Testing for Components & API

## Context

- **Parent Plan:** [Extension Improvements](./plan.md)
- **Dependencies:** None
- **Docs:** [Code Standards](../../docs/code-standards.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-16 |
| Description | Add comprehensive unit tests for React components and API client |
| Priority | P1 |
| Implementation Status | ✅ Completed |
| Review Status | ⬜ Pending |
| Effort | 4h |

## Key Insights

1. Current tests only cover `constants.ts` and `utils.ts` (18 tests)
2. No tests for React components, API client, or storage
3. Testing infrastructure already in place (Vitest + RTL)
4. Need mocking for browser APIs and fetch

## Requirements

1. Unit tests for all React components in `components/`
2. API client tests with mocked fetch
3. Storage utility tests with mocked browser.storage
4. Minimum 80% coverage target

## Architecture

```
src/
├── __tests__/
│   ├── setup.ts              # Existing setup
│   ├── mocks/
│   │   ├── browser.ts        # NEW: Mock webextension-polyfill
│   │   └── fetch.ts          # NEW: Mock fetch API
├── components/
│   ├── popup/
│   │   ├── Login.tsx
│   │   ├── Login.test.tsx    # NEW
│   │   ├── InboxList.tsx
│   │   ├── InboxList.test.tsx # NEW
│   │   └── ...
│   └── shared/
│       ├── CreateInboxModal.tsx
│       ├── CreateInboxModal.test.tsx # NEW
│       └── ...
├── shared/
│   ├── api.ts
│   ├── api.test.ts           # NEW
│   ├── storage.ts
│   ├── storage.test.ts       # NEW
│   └── ...
```

## Related Code Files

| File | Purpose | Test Needed |
|------|---------|-------------|
| `src/shared/api.ts` | API client | Yes - mock fetch |
| `src/shared/storage.ts` | Browser storage wrapper | Yes - mock browser |
| `src/components/popup/Login.tsx` | Login form | Yes |
| `src/components/popup/InboxList.tsx` | Inbox listing | Yes |
| `src/components/popup/MessageList.tsx` | Message display | Yes |
| `src/components/popup/Settings.tsx` | Settings panel | Yes |
| `src/components/shared/CreateInboxModal.tsx` | Modal | Yes |
| `src/components/shared/QRCodeModal.tsx` | QR Modal | Yes |

## Implementation Steps

### Step 1: Create Mock Utilities (30min)

```typescript
// src/__tests__/mocks/browser.ts
export const mockBrowser = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
};

vi.mock('webextension-polyfill', () => ({ default: mockBrowser }));
```

```typescript
// src/__tests__/mocks/fetch.ts
export const mockFetch = vi.fn();
global.fetch = mockFetch;

export function mockApiResponse(data: unknown, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 401,
    json: () => Promise.resolve(data),
  });
}
```

### Step 2: API Client Tests (1h)

```typescript
// src/shared/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { mockApiResponse, mockFetch } from '../__tests__/mocks/fetch';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should store token on successful login', async () => {
      mockApiResponse({ token: 'jwt123', user: { id: '1', email: 'test@test.com' } });

      const result = await api.login('test@test.com', 'password');

      expect(result.token).toBe('jwt123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle 2FA requirement', async () => {
      mockApiResponse({ requires2FA: true, tempToken: 'temp123' });

      const result = await api.login('test@test.com', 'password');

      expect(result.requires2FA).toBe(true);
      expect(result.tempToken).toBe('temp123');
    });
  });

  describe('token refresh', () => {
    it('should retry request after token refresh', async () => {
      // First call fails with 401
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      // Refresh succeeds
      mockApiResponse({ token: 'newToken' });
      // Retry succeeds
      mockApiResponse({ data: 'success' });

      // ... test implementation
    });
  });
});
```

### Step 3: Storage Tests (30min)

```typescript
// src/shared/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from './storage';
import { mockBrowser } from '../__tests__/mocks/browser';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuth', () => {
    it('should return default auth when empty', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const auth = await storage.getAuth();

      expect(auth).toEqual({
        token: null,
        user: null,
        isAuthenticated: false,
        isAnonymous: false,
      });
    });
  });

  describe('setAuth', () => {
    it('should store auth with isAuthenticated=true', async () => {
      await storage.setAuth('token123', { id: '1' });

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        auth: expect.objectContaining({ isAuthenticated: true }),
      });
    });
  });
});
```

### Step 4: Component Tests (2h)

```typescript
// src/components/popup/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { api } from '../../shared/api';

vi.mock('../../shared/api');

describe('Login', () => {
  it('should render login form', () => {
    render(<Login onSuccess={vi.fn()} />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call api.login on form submit', async () => {
    const onSuccess = vi.fn();
    (api.login as vi.Mock).mockResolvedValue({ token: 'jwt', user: {} });

    render(<Login onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should show error on failed login', async () => {
    (api.login as vi.Mock).mockRejectedValue(new Error('Invalid credentials'));

    render(<Login onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

## Todo List

- [ ] Create `src/__tests__/mocks/browser.ts`
- [ ] Create `src/__tests__/mocks/fetch.ts`
- [ ] Update `src/__tests__/setup.ts` to import mocks
- [ ] Create `src/shared/api.test.ts`
- [ ] Create `src/shared/storage.test.ts`
- [ ] Create `src/components/popup/Login.test.tsx`
- [ ] Create `src/components/popup/InboxList.test.tsx`
- [ ] Create `src/components/popup/MessageList.test.tsx`
- [ ] Create `src/components/popup/Settings.test.tsx`
- [ ] Create `src/components/shared/CreateInboxModal.test.tsx`
- [ ] Run coverage report and verify ≥80%

## Success Criteria

1. All new tests pass (`npm run test`)
2. Coverage ≥80% for tested files
3. No console errors during tests
4. Mocks properly isolate browser APIs

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Complex component mocking | Medium | Medium | Use React Testing Library best practices |
| Browser API mocking issues | Low | High | Test mocks in isolation first |

## Security Considerations

- Ensure no real API calls in tests
- Mock tokens should not resemble real tokens
- No sensitive data in test fixtures

## Next Steps

After completing Phase 01:
1. Integrate tests into CI/CD pipeline
2. Proceed to [Phase 02: E2E Testing](./phase-02-e2e-testing.md)
