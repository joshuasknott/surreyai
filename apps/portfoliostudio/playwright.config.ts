import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./output/playwright/test-results",
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:8788",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "node scripts/test-server.mjs",
    url: "http://127.0.0.1:8788",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
