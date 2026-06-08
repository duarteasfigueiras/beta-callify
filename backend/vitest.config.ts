import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 8000,
    hookTimeout: 8000,
    // Env required so modules under test (auth.ts) don't throw on import.
    // Supabase itself is mocked in the tests, so these are placeholders.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-at-least-32-characters-long-0000000',
      SUPABASE_URL: 'http://localhost',
      SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
