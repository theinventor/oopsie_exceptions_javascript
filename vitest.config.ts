import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["packages/*/src/**/*.{test,int.test}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "packages/*/src/**/*.{test,int.test}.{ts,tsx}",
        "packages/*/src/**/*.test-d.ts",
        "packages/*/src/**/__tests__/**",
        "packages/*/src/index.ts",
        "packages/*/src/types.ts",
      ],
      thresholds: {
        "packages/core/src/**": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        "packages/node/src/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "packages/browser/src/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        "packages/nextjs/src/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
});
