import type { Config } from "jest";

const config: Config = {
  projects: ["<rootDir>/jest.config.ts", "<rootDir>/jest.config.server.ts"],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/tests/**",
    "!src/**/__tests__/**",
    "!src/types/**",
    "!src/app/**",
    "!src/db.ts",
  ],
  // json-summary keeps coverage/coverage-summary.json regenerating on every run —
  // it's what the README coverage numbers are checked against (it had silently
  // gone stale because the default reporter set omits it).
  coverageReporters: ["text", "lcov", "json", "json-summary", "clover"],
  // Regression floor ~2pts under current (92.06 L / 91.98 F / 90.27 S / 87.36 B as
  // of 2026-06) — a real coverage drop fails the pre-push/CI --coverage runs
  // loudly instead of silently eroding the README's advertised numbers.
  coverageThreshold: {
    global: { lines: 90, functions: 89, statements: 88, branches: 85 },
  },
};

export default config;
