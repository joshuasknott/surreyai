import { defineConfig, devices } from '@playwright/test';
const host=process.env.E2E_HOST || '127.0.0.1';
export default defineConfig({
  testDir:'./e2e', testIgnore:['planner.spec.ts'], timeout:30000,
  expect:{timeout:8000}, fullyParallel:false, workers:1,
  forbidOnly:Boolean(process.env.CI), retries:process.env.CI?1:0, reporter:'list',
  use:{...devices['Desktop Chrome'],baseURL:`http://${host}:4321`,trace:'on-first-retry'},
  webServer:{command:`npm run dev -w apps/ai -- --host ${host}`,env:{...process.env,ASTRO_DEV_BACKGROUND:'0'},url:`http://${host}:4321`,reuseExistingServer:!process.env.CI,timeout:120000},
});
