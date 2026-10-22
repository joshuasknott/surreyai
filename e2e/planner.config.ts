import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const origin = process.env.PLANNER_TEST_ORIGIN || 'http://127.0.0.1:4321';
export default defineConfig({
  testDir: '.', testMatch: ['planner.spec.ts', 'launch.spec.ts'], timeout: 60000,
  expect: { timeout: 12000 }, workers: 1, fullyParallel: false,
  reporter: 'list', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 }, trace: 'retain-on-failure' },
  webServer: {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    command: 'npm run dev -w apps/ai -- --host 127.0.0.1',
    url: `${origin}/committee/planner`,
    reuseExistingServer: false,
    timeout: 120000,
    // The browser fixtures intercept Clerk and Convex. Never depend on a local
    // production credential file or a hosted database for this suite.
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: '0',
      PUBLIC_CLERK_KEYLESS_DISABLED: 'true',
      PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_Zml4dHVyZS50ZXN0JA==', // Public fixture.test key; gitleaks:allow
      CONVEX_URL: 'https://fixture.convex.cloud',
      CONVEX_SITE_URL: 'https://fixture.convex.site',
    },
  },
});
