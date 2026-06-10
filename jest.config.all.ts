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
};

export default config;
