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
  // Regression floor for `npm run test:all -- --coverage` (and CI). The merged
  // two-project coverage run currently measures ~49% lines / ~39% functions —
  // the README's 91.9% headline is NOT reproducible through this config (see the
  // audit note). Floor is set a few points below actual so normal churn passes
  // but a real drop fails the build. Raise as coverage genuinely improves.
  coverageThreshold: {
    global: {
      lines: 45,
      functions: 35,
    },
  },
};

export default config;
