---
parent: ./plan.md
phase: 02
title: E2E Testing with Playwright
---

# Phase 02: E2E Testing with Playwright

## Context

- **Parent Plan:** [Extension Improvements](./plan.md)
- **Dependencies:** [Phase 01: Unit Testing](./phase-01-unit-testing.md)
- **Docs:** [WXT Testing Guide](https://wxt.dev/guide/testing.html)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-16 |
| Description | Add E2E tests for extension using Playwright |
| Priority | P2 |
| Implementation Status | ✅ Completed |
| Review Status | ⬜ Pending |
| Effort | 3h |

## Key Insights

1. Playwright supports Chrome extension testing via persistent context
2. WXT provides built-in test helpers for extension E2E
3. Focus on critical user flows: login, inbox creation, autofill
4. Run against built extension, not dev server

## Requirements

1. E2E tests for popup workflow (login → inbox → messages)
2. E2E tests for content script autofill
3. E2E tests for context menu actions
4. Tests run in CI with headless Chrome

## Architecture

```
services/extension/
├── e2e/
│   ├── fixtures/
│   │   └── extension.ts      # Extension fixture
│   ├── pages/
│   │   └── popup.page.ts     # Page object for popup
│   ├── tests/
│   │   ├── popup.spec.ts     # Popup flow tests
│   │   ├── autofill.spec.ts  # Content script tests
│   │   └── context-menu.spec.ts
│   └── playwright.config.ts
├── package.json              # Add playwright deps
```

## Related Code Files

| File | Purpose | E2E Coverage |
|------|---------|--------------|
| `entrypoints/popup/App.tsx` | Main popup | Yes |
| `entrypoints/content.ts` | Autofill | Yes |
| `entrypoints/background.ts` | Context menus | Yes |

## Implementation Steps

### Step 1: Install Playwright (15min)

```bash
cd services/extension
npm install -D @playwright/test playwright
npx playwright install chromium
```

Update `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

### Step 2: Playwright Config (15min)

```typescript
// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    headless: false, // Extensions require headed mode
    viewport: { width: 400, height: 600 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
```

### Step 3: Extension Fixture (30min)

```typescript
// e2e/fixtures/extension.ts
import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
```

### Step 4: Popup Page Object (30min)

```typescript
// e2e/pages/popup.page.ts
import { Page } from '@playwright/test';

export class PopupPage {
  constructor(private page: Page) {}

  async goto(extensionId: string) {
    await this.page.goto(`chrome-extension://${extensionId}/popup.html`);
  }

  // Login form
  get emailInput() {
    return this.page.getByPlaceholder(/email/i);
  }

  get passwordInput() {
    return this.page.getByPlaceholder(/password/i);
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /sign in/i });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // Inbox list
  get createInboxButton() {
    return this.page.getByRole('button', { name: /create new inbox/i });
  }

  get inboxItems() {
    return this.page.locator('.card-material');
  }

  async waitForInboxList() {
    await this.page.waitForSelector('text=Active Inboxes');
  }
}
```

### Step 5: Popup E2E Tests (1h)

```typescript
// e2e/tests/popup.spec.ts
import { test, expect } from '../fixtures/extension';
import { PopupPage } from '../pages/popup.page';

test.describe('Popup', () => {
  test('should show login form when not authenticated', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    await expect(popup.emailInput).toBeVisible();
    await expect(popup.passwordInput).toBeVisible();
    await expect(popup.loginButton).toBeVisible();
  });

  test('should login and show inbox list', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);
    await popup.login('test@example.com', 'testpassword');

    await popup.waitForInboxList();
    await expect(popup.createInboxButton).toBeVisible();
  });

  test('should create new inbox', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);
    // Assume already logged in via storage mock
    await popup.waitForInboxList();

    const initialCount = await popup.inboxItems.count();
    await popup.createInboxButton.click();

    // Wait for modal and create
    await page.getByRole('button', { name: /random/i }).click();

    await expect(popup.inboxItems).toHaveCount(initialCount + 1);
  });
});
```

### Step 6: Autofill E2E Tests (30min)

```typescript
// e2e/tests/autofill.spec.ts
import { test, expect } from '../fixtures/extension';

test.describe('Content Script Autofill', () => {
  test('should inject icon on email input', async ({ context }) => {
    const page = await context.newPage();

    // Navigate to a page with email input
    await page.setContent(`
      <html>
        <body>
          <input type="email" id="email" placeholder="Enter email" />
        </body>
      </html>
    `);

    // Wait for content script to inject
    await page.waitForTimeout(500);

    // Check for injected icon
    const icon = page.locator('.ephemera-icon-container');
    await expect(icon).toBeVisible();
  });

  test('should show dropdown on icon click', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <html>
        <body>
          <input type="email" id="email" placeholder="Enter email" />
        </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const icon = page.locator('.ephemera-icon-container');
    await icon.click();

    // Dropdown should appear (in shadow DOM)
    const dropdown = page.locator('.ephemera-dropdown-root');
    await expect(dropdown).toBeVisible();
  });
});
```

## Todo List

- [ ] Install Playwright and dependencies
- [ ] Create `e2e/playwright.config.ts`
- [ ] Create `e2e/fixtures/extension.ts`
- [ ] Create `e2e/pages/popup.page.ts`
- [ ] Create `e2e/tests/popup.spec.ts`
- [ ] Create `e2e/tests/autofill.spec.ts`
- [ ] Create `e2e/tests/context-menu.spec.ts`
- [ ] Add `test:e2e` script to package.json
- [ ] Run E2E tests and fix any failures
- [ ] Document test environment setup

## Success Criteria

1. All E2E tests pass in headed Chrome
2. Tests cover login, inbox creation, autofill flows
3. CI can run tests (with xvfb for headed mode)
4. Test execution < 2 minutes

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Extension loading issues | Medium | High | Use persistent context correctly |
| Flaky tests | Medium | Medium | Add proper waits, retries |
| CI headed mode | Low | Medium | Use xvfb-run in CI |

## Security Considerations

- E2E tests use test accounts only
- Never store real credentials in test files
- Mock API responses where possible

## Next Steps

After completing Phase 02:
1. Add E2E tests to CI pipeline
2. Proceed to [Phase 03: i18n Localization](./phase-03-i18n-localization.md)
