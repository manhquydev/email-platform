---
sidebar_position: 1
---

# Playwright Example

Complete E2E test with Playwright and Ephemera.

```typescript
import { test, expect } from '@playwright/test';
import { EphemeraClient } from '@ephemera/sdk';

const ephemera = new EphemeraClient(process.env.EPHEMERA_API_KEY!);

test.describe('Email Verification Flow', () => {
  test('user can signup and verify email', async ({ page }) => {
    // Create temporary inbox
    const inbox = await ephemera.createInbox();

    // Fill signup form
    await page.goto('/signup');
    await page.fill('[name="email"]', inbox.address);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Wait for verification email
    const message = await ephemera.waitForEmail(inbox.id, {
      subject: 'Verify your email',
      timeout: 30000
    });

    // Extract and enter code
    const code = ephemera.extractCode(message)!;
    await page.fill('[name="verificationCode"]', code);
    await page.click('button:text("Verify")');

    // Assert success
    await expect(page.locator('.welcome-message')).toBeVisible();
    await expect(page).toHaveURL('/dashboard');

    // Cleanup
    await ephemera.deleteInbox(inbox.id);
  });

  test('user can reset password', async ({ page }) => {
    const inbox = await ephemera.createInbox();

    await page.goto('/forgot-password');
    await page.fill('[name="email"]', inbox.address);
    await page.click('button[type="submit"]');

    const message = await ephemera.waitForEmail(inbox.id, {
      subject: 'Reset your password',
      timeout: 30000
    });

    // Extract reset link from email
    const resetLink = message.htmlBody?.match(/href="([^"]*reset[^"]*)"/)?.[1];
    expect(resetLink).toBeTruthy();

    await page.goto(resetLink!);
    await page.fill('[name="password"]', 'NewSecurePass456!');
    await page.fill('[name="confirmPassword"]', 'NewSecurePass456!');
    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toBeVisible();
    await ephemera.deleteInbox(inbox.id);
  });
});
```

## Setup

### Install Dependencies

```bash
npm install @playwright/test @ephemera/sdk
```

### Configure Environment

```bash
# .env
EPHEMERA_API_KEY=eph_live_xxxx
```

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```
