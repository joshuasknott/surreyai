import { defineConfig, devices } from '@playwright/test';

const origin = process.env.PLANNER_TEST_ORIGIN || 'http://127.0.0.1:4321';
export default defineConfig({
  testDir: '.', testMatch: ['planner.spec.ts', 'launch.spec.ts'], timeout: 60000,
  expect: { timeout: 12000 }, workers: 1, fullyParallel: false,
  reporter: 'list', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -w apps/ai -- --host 127.0.0.1', url: `${origin}/committee/planner`, reuseExistingServer: true, timeout: 120000, env: { ...process.env, ASTRO_DEV_BACKGROUND: '0' } },
});
