import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config(); // load api/.env

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set in api/.env — tests require a dedicated test database");
}

export default defineConfig({
  test: {
    globals: true,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
    },
    include: [
      "src/tests/**/*.test.ts",
      "src/lib/**/tests/**/*.test.ts",
      "src/middleware/**/tests/**/*.test.ts",
      "src/services/**/tests/**/*.test.ts",
    ],
    setupFiles: [
      "./src/tests/setup.ts",
      "./src/services/auth/tests/setup.ts",
      "./src/services/product/tests/setup.ts",
      "./src/services/cart/tests/setup.ts",
      "./src/services/order/tests/setup.ts",
      "./src/services/payment/tests/setup.ts",
      "./src/services/upload/tests/setup.ts",
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
