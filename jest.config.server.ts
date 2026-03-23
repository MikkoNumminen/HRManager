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
  },
};

export default createJestConfig(config);
