import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const webServerEnv = { ...process.env, ASTRO_DEV_BACKGROUND: '0' };

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev -w apps/ai -- --host 127.0.0.1',
      env: webServerEnv,
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w apps/business -- --host 127.0.0.1',
      env: webServerEnv,
      url: 'http://127.0.0.1:4322',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w apps/neurotech -- --host 127.0.0.1',
      env: webServerEnv,
      url: 'http://127.0.0.1:4323',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
