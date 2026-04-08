import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      // Use existing DATABASE_URL if set (e.g., in CI), otherwise fallback to local dev port
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5434/email_service_test",
      JWT_SECRET: "test-secret",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6380",
      // Add dummy Stripe keys for tests
      STRIPE_API_KEY: "sk_test_dummy_key_for_testing_only",
      STRIPE_WEBHOOK_SECRET: "whsec_test_dummy_secret",
    },
    // Include both current and legacy API suites.
    include: ['src/test/**/*.test.ts', 'test/**/*.test.ts'],
    fileParallelism: false,
  },
});
