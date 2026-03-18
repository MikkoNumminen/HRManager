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
};

export default config;
