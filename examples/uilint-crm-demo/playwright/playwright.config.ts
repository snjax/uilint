import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;
const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.resolve(configDir, 'tests'),
  timeout: 30_000,
  reporter: [['list']],
  use: {
    headless: true,
    baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm preview:test',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

