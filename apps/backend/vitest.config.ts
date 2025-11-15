import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The HTTP tests share module-level Prometheus registries and the rate-limit
    // clock, so files run one at a time rather than in parallel workers.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret_not_used_outside_tests',
    },
  },
});
