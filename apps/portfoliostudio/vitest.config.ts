import { defineConfig } from "vitest/config";

export default defineConfig({
  // Keep Vitest/Oxc on this app's TypeScript project inside the monorepo.
  tsconfig: "./tsconfig.json",
  test: {
    include: ["server.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    maxWorkers: 2,
    testTimeout: 15000,
  },
});
