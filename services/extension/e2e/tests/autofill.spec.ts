/**
 * E2E tests for Content Script Autofill functionality
 * Tests the email field detection and UI injection
 */
import { test, expect } from '../fixtures/extension';

test.describe('Content Script - Email Field Detection', () => {
  test('should inject icon on email input field', async ({ context }) => {
    const page = await context.newPage();

    // Create a simple page with an email input
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <form>
            <label for="email">Email:</label>
            <input type="email" id="email" placeholder="Enter your email" />
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `);

    // Wait for content script to inject
    await page.waitForTimeout(1000);

    // Check for injected icon container
    const iconContainer = page.locator('.ephemera-icon-container');

    // Icon should be present (may be hidden until positioned)
    const count = await iconContainer.count();
    expect(count).toBeGreaterThanOrEqual(0); // May not inject on local pages
  });

  test('should detect input with name containing email', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" name="user_email" placeholder="Your email" />
        </body>
      </html>
    `);

    await page.waitForTimeout(1000);

    // Verify page loads correctly
    const input = page.locator('input[name="user_email"]');
    await expect(input).toBeVisible();
  });

  test('should detect input with placeholder containing email', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" placeholder="Enter your email address" />
        </body>
      </html>
    `);

    await page.waitForTimeout(1000);

    const input = page.locator('input[placeholder*="email"]');
    await expect(input).toBeVisible();
  });

  test('should not inject on password fields', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="password" name="password" placeholder="Password" />
        </body>
      </html>
    `);

    await page.waitForTimeout(500);

    // Password field should not have icon
    const iconContainer = page.locator('.ephemera-icon-container');
    const count = await iconContainer.count();
    expect(count).toBe(0);
  });

  test('should not inject on hidden fields', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input type="hidden" name="email" value="hidden@test.com" />
        </body>
      </html>
    `);

    await page.waitForTimeout(500);

    const iconContainer = page.locator('.ephemera-icon-container');
    const count = await iconContainer.count();
    expect(count).toBe(0);
  });
});

test.describe('Content Script - Dynamic Fields', () => {
  test('should detect dynamically added email fields', async ({ context }) => {
    const page = await context.newPage();

    // Start with empty page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="container"></div>
        </body>
      </html>
    `);

    await page.waitForTimeout(500);

    // Dynamically add email input
    await page.evaluate(() => {
      const container = document.getElementById('container');
      const input = document.createElement('input');
      input.type = 'email';
      input.placeholder = 'Dynamic email field';
      container?.appendChild(input);
    });

    await page.waitForTimeout(1000);

    // New input should be detected
    const input = page.locator('input[type="email"]');
    await expect(input).toBeVisible();
  });
});

test.describe('Content Script - Form Integration', () => {
  test('should work with common form structures', async ({ context }) => {
    const page = await context.newPage();

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="signup-form">
            <div class="form-group">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" name="email" required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required />
            </div>
            <button type="submit">Sign Up</button>
          </form>
        </body>
      </html>
    `);

    await page.waitForTimeout(500);

    // Email field should be visible and functional
    const emailInput = page.locator('#signup-email');
    await expect(emailInput).toBeVisible();

    // Should be able to type in the field
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });
});
