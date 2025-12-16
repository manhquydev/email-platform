import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/email_service_test",
      JWT_SECRET: "test-secret",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6380",
    },
    // Ensure we don't treat tests as ESM if we don't want to, or configure extensions
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
  },
});
