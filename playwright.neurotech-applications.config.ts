import { defineConfig, devices } from '@playwright/test';

const externalOrigin = process.env.E2E_APPLICATIONS_URL?.replace(/\/$/, '');
const host = process.env.E2E_HOST || '127.0.0.1';
const origin = externalOrigin || `http://${host}:4324`;
const localEnv = {
  ...process.env,
  ASTRO_DEV_BACKGROUND: '0',
  RESEND_API_KEY: 'e2e-resend-key',
  COMMITTEE_FROM_EMAIL: 'Neurotech E2E <applications@example.com>',
  BLOB_READ_WRITE_TOKEN: 'e2e-blob-token',
  APPLICATIONS_CLOSE_AT: '',
};

export default defineConfig({
  testDir: './e2e',
  testMatch: ['neurotech-standalone.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: origin,
    trace: 'retain-on-failure',
  },
  ...(externalOrigin ? {} : {
    webServer: {
      command: `npm run dev -w apps/neurotech-applications -- --host ${host} --port 4324`,
      url: origin,
      reuseExistingServer: true,
      timeout: 120_000,
      env: localEnv,
    },
  }),
});
