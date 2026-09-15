import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(_dirname, '../apps/backend');
const frontendDir = resolve(_dirname, '../apps/frontend');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      threshold: 0.2,
    },
  },
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node --import tsx/esm src/main.ts',
      url: 'http://localhost:3001/_app/layout',
      reuseExistingServer: !process.env['CI'],
      cwd: backendDir,
      env: { DATABASE_URL: 'file:./prisma/dev.db', PORT: '3001' },
      timeout: 30_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:4300',
      reuseExistingServer: !process.env['CI'],
      cwd: frontendDir,
      timeout: 60_000,
    },
  ],
});
