import { defineConfig } from 'vitest/config';

export default defineConfig({
  // An inline (empty) PostCSS config stops Vite from loading postcss.config.mjs,
  // whose Tailwind plugin is written for Next's loader and is irrelevant to
  // these pure-logic tests.
  css: { postcss: {} },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
