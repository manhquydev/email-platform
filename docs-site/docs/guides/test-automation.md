---
sidebar_position: 1
---

# Test Automation Guide

Use Ephemera to automate email verification in E2E tests.

## Why Use Ephemera for Testing?

- **No real emails needed** - Create disposable addresses on-demand
- **Fast** - Emails arrive in seconds, not minutes
- **Reliable** - No flaky email delivery issues
- **Clean** - Each test gets a fresh inbox

## Framework Examples

### Playwright

```typescript
import { test, expect } from '@playwright/test';
import { EphemeraClient } from '@ephemera/sdk';

const ephemera = new EphemeraClient(process.env.EPHEMERA_API_KEY!);

test('signup with email verification', async ({ page }) => {
  const inbox = await ephemera.createInbox();

  await page.goto('/signup');
  await page.fill('[name="email"]', inbox.address);
  await page.fill('[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');

  const message = await ephemera.waitForEmail(inbox.id, {
    subject: 'Verify',
    timeout: 30000
  });

  const code = ephemera.extractCode(message)!;
  await page.fill('[name="code"]', code);
  await page.click('button:text("Verify")');

  await expect(page.locator('.welcome')).toBeVisible();
  await ephemera.deleteInbox(inbox.id);
});
```

### Cypress

```typescript
describe('Signup', () => {
  it('completes email verification', () => {
    cy.task('createInbox').then((inbox: any) => {
      cy.visit('/signup');
      cy.get('[name="email"]').type(inbox.address);
      cy.get('[name="password"]').type('Test123!');
      cy.get('button[type="submit"]').click();

      cy.task('waitForEmail', { inboxId: inbox.id, subject: 'Verify' })
        .then((message: any) => {
          cy.task('extractCode', message).then((code: string) => {
            cy.get('[name="code"]').type(code);
            cy.get('button').contains('Verify').click();
            cy.get('.welcome').should('be.visible');
          });
        });
    });
  });
});
```

## Best Practices

1. **Create inbox per test** - Avoid cross-test pollution
2. **Set reasonable timeouts** - 30-60s for verification emails
3. **Clean up after tests** - Delete inboxes when done
4. **Use fixtures** - Share client instance across tests
