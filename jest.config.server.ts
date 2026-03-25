import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  displayName: "server",
  testEnvironment: "node",
  maxWorkers: 1,
  testMatch: ["<rootDir>/src/tests/server/**/*.test.ts"],
  testPathIgnorePatterns: ["<rootDir>/.claude/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  setupFiles: ["<rootDir>/src/tests/server/loadEnv.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-intl/server$": "<rootDir>/src/tests/mocks/next-intl-server.ts",
    "^pg-boss$": "<rootDir>/src/tests/mocks/pg-boss.ts",
  },
  // Prisma 7 ships ESM — transform its .mjs files so Jest (CJS) can parse them
  transformIgnorePatterns: ["node_modules/(?!(@prisma/client)/)"],
};

export default createJestConfig(config);
