import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for extension E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 1, // Extensions require sequential execution
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    // Extensions require headed mode
    headless: false,
    viewport: { width: 400, height: 600 },
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  // Build extension before running tests
  webServer: {
    command: 'npm run build',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
