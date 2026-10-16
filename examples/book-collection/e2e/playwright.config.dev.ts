import { defineConfig, devices } from '@playwright/test';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(_dirname, '../apps/backend');
const frontendDir = resolve(_dirname, '../apps/frontend');
const testsDir = resolve(_dirname, 'tests');

export default defineConfig({
  testDir: testsDir,
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: false,
  retries: 0,
  updateSnapshots: 'missing',
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
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
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node --import tsx/esm src/main.ts',
      url: 'http://localhost:4444/_app/layout',
      reuseExistingServer: true,
      cwd: backendDir,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:4300',
      reuseExistingServer: true,
      cwd: frontendDir,
      timeout: 60_000,
    },
  ],
});
