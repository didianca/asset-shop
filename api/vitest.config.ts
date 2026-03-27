import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "tests/**/*.test.ts",
      "src/lib/**/tests/**/*.test.ts",
      "src/middleware/**/tests/**/*.test.ts",
      "src/services/**/tests/**/*.test.ts",
    ],
    setupFiles: [
      "./src/services/auth/tests/setup.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/db.ts", "src/generated/**"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
