/**
 * Jest configuration used exclusively by Stryker mutation testing.
 *
 * This is a flat (non-projects) config so that Stryker can read and
 * serialize it to JSON without losing the TypeScript transform setup.
 * It targets only the server-side tests (pure Node, no jsdom) because
 * those cover the files we actually mutate: lib/, features/actions.ts,
 * features/queries.ts, schemas.ts, permissions.ts, actionErrors.ts.
 *
 * Client-component tests are excluded here because they require the
 * full Next.js / SWC jsdom setup that doesn't survive JSON serialisation.
 */

import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const customConfig = {
  displayName: "stryker",
  testEnvironment: "node",
  maxWorkers: 1,
  // Only run tests that cover the mutated files (server-side logic)
  testMatch: ["<rootDir>/src/tests/server/**/*.test.ts"],
  testPathIgnorePatterns: ["<rootDir>/.claude/", "<rootDir>/.stryker-tmp/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/", "<rootDir>/.stryker-tmp/"],
  setupFiles: ["<rootDir>/src/tests/server/loadEnv.ts"],
  // ⚠️ KEEP moduleNameMapper + transformIgnorePatterns IN SYNC with jest.config.server.ts.
  // Any module mocked there (ESM-only deps in particular) must be mirrored here, or
  // Stryker's initial dry run fails with "Cannot use import statement outside a module".
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-intl/server$": "<rootDir>/src/tests/mocks/next-intl-server.ts",
    // pg-boss is ESM-only; mock it (as jest.config.server.ts does) so the dry run
    // doesn't load it untransformed → "Cannot use import statement outside a module".
    "^pg-boss$": "<rootDir>/src/tests/mocks/pg-boss.ts",
  },
  // Prisma 7 ships ESM — transform its .mjs files so Jest (CJS) can parse them
  transformIgnorePatterns: ["node_modules/(?!(@prisma/client)/)"],
};

export default createJestConfig(customConfig);
