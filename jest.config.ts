import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig: Config = {
  displayName: "client",
  setupFiles: ["<rootDir>/jest.polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/src/tests/server/", "<rootDir>/.claude/", "<rootDir>/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next/image$": "<rootDir>/__mocks__/next/image.js",
    "^pg-boss$": "<rootDir>/src/tests/mocks/pg-boss.js",
    "^next-auth$": "<rootDir>/src/tests/mocks/next-auth.js",
    "^next-auth/(.*)$": "<rootDir>/src/tests/mocks/next-auth.js",
    "^@auth/core$": "<rootDir>/src/tests/mocks/next-auth.js",
    "^@auth/core/(.*)$": "<rootDir>/src/tests/mocks/next-auth.js",
    "^mongodb$": "<rootDir>/src/tests/mocks/mongodb.js",
    "^mongodb/(.*)$": "<rootDir>/src/tests/mocks/mongodb.js",
  },
};

export default createJestConfig(customJestConfig);
