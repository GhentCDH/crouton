import { defineConfig, devices } from '@playwright/test';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const bookCollectionDir = resolve(_dirname, '..');
const backendDir = resolve(_dirname, '../apps/backend');
const frontendDir = resolve(_dirname, '../apps/frontend');

const backendPort = process.env['BACKEND_PORT'] ?? '4444';
const frontendPort = process.env['FRONTEND_PORT'] ?? '4300';
const usePreview = process.env['CI'] || process.env['USE_PREVIEW_SERVER'] === 'true';

export default defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  updateSnapshots: 'missing',
  workers: 1,//process.env['CI'] ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      threshold: 0.2,
    },
  },
  use: {
    baseURL: `http://localhost:${frontendPort}`,
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
      url: `http://localhost:${backendPort}/_app/layout`,
      reuseExistingServer: false,
      cwd: backendDir,
      env: { DATABASE_URL: 'file:///tmp/e2e.db', PORT: backendPort },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000,
    },
    {
      command: `${usePreview ? 'pnpm preview' : 'pnpm dev'} --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: !usePreview,
      cwd: frontendDir,
      env: { BACKEND_PORT: backendPort },
      timeout: 60_000,
    },
  ],
});
