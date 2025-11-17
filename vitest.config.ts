import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@uilint/core': path.resolve(rootDir, 'packages/uilint-core/src/index.ts'),
      '@uilint/playwright': path.resolve(rootDir, 'packages/uilint-playwright/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'istanbul',
    },
  },
});

