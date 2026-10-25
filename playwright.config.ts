import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const origin = 'http://127.0.0.1:4343';

export default defineConfig({
  testDir: fileURLToPath(new URL('./e2e/', import.meta.url)),
  testMatch: ['planner.spec.ts'],
  timeout: 60000,
  expect: { timeout: 12000 },
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 }, trace: 'retain-on-failure' },
  webServer: {
    cwd: fileURLToPath(new URL('./', import.meta.url)),
    command: 'npx astro dev --host 127.0.0.1 --port 4343',
    url: `${origin}/committee/planner`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      PUBLIC_CLERK_KEYLESS_DISABLED: 'true',
      PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_Zml4dHVyZS50ZXN0JA==',
      CONVEX_URL: 'https://fixture.convex.cloud',
      CONVEX_SITE_URL: 'https://fixture.convex.site',
    },
  },
});
