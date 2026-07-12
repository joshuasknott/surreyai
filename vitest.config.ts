import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          include: ["packages/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
