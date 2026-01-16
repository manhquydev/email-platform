/**
 * Playwright fixture for loading the Chrome extension
 * Provides a browser context with the extension loaded
 */
import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

// Extend Playwright's test with extension-specific fixtures
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Create a browser context with the extension loaded
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../.output/chrome-mv3');

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--disable-gpu',
      ],
    });

    await use(context);
    await context.close();
  },

  // Extract the extension ID from the service worker URL
  extensionId: async ({ context }, use) => {
    // Wait for the service worker to be registered
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10000 });
    }

    // Extract extension ID from service worker URL
    // Format: chrome-extension://<extension-id>/background.js
    const extensionId = background.url().split('/')[2];

    await use(extensionId);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to get the popup URL for the extension
 */
export function getPopupUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/popup.html`;
}

/**
 * Helper to get the sidepanel URL for the extension
 */
export function getSidepanelUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/sidepanel.html`;
}
