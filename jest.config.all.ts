import type { Config } from "jest";

const config: Config = {
  projects: ["<rootDir>/jest.config.ts", "<rootDir>/jest.config.server.ts"],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/tests/**",
    "!src/types/**",
    "!src/app/**",
    "!src/db.ts",
  ],
  // Regression floor for `npm run test:all -- --coverage` (and CI). Set below
  // the current ~91.9% line / ~83.5% function coverage so normal churn passes
  // but a real drop fails the build. Raise as coverage improves.
  coverageThreshold: {
    global: {
      lines: 88,
      functions: 80,
    },
  },
};

export default config;
