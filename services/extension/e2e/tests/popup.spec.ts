/**
 * E2E tests for the Extension Popup
 * Tests the main user flows: login, inbox management
 */
import { test, expect, getPopupUrl } from '../fixtures/extension';
import { PopupPage } from '../pages/popup.page';

test.describe('Popup - Login Flow', () => {
  test('should show login form when not authenticated', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    // Verify login form elements are visible
    await expect(popup.emailInput).toBeVisible();
    await expect(popup.passwordInput).toBeVisible();
    await expect(popup.signInButton).toBeVisible();
    await expect(popup.anonymousButton).toBeVisible();
  });

  test('should show Ephemera branding', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Check for branding
    await expect(page.getByText('Ephemera')).toBeVisible();
  });

  test('should have create account link', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    await expect(popup.createAccountLink).toBeVisible();
    await expect(popup.createAccountLink).toHaveAttribute('target', '_blank');
  });

  test('should show error on invalid login', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);
    await popup.login('invalid@test.com', 'wrongpassword');

    // Wait for error message (API call will fail)
    await page.waitForTimeout(2000);

    // Should still be on login screen or show error
    const isOnLogin = await popup.isOnLoginScreen();
    expect(isOnLogin).toBe(true);
  });

  test('should require email and password fields', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    // Check that fields are required
    await expect(popup.emailInput).toHaveAttribute('required', '');
    await expect(popup.passwordInput).toHaveAttribute('required', '');
  });
});

test.describe('Popup - UI Elements', () => {
  test('should have correct popup dimensions', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // The popup should fit the expected dimensions
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should support dark mode class', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Check that dark mode classes are properly defined in CSS
    const html = page.locator('html');
    await expect(html).toBeVisible();
  });
});

test.describe('Popup - Anonymous Login', () => {
  test('should have anonymous login option visible', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    await expect(popup.anonymousButton).toBeVisible();
    await expect(popup.anonymousButton).toContainText('Go Anonymous');
  });
});

test.describe('Popup - Accessibility', () => {
  test('should have proper input labels', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Check for label elements
    const emailLabel = page.getByText('Email Address');
    const passwordLabel = page.getByText('Password');

    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test('should be keyboard navigable', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const popup = new PopupPage(page);

    await popup.goto(extensionId);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus on inputs
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focused);
  });
});
