// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "jest",
  jest: {
    // Dedicated flat config (non-projects) so Stryker can serialise it to
    // JSON without losing the Next.js / SWC TypeScript transform setup.
    // Covers server-side tests which exercise the mutated files.
    configFile: "jest.config.stryker.mjs",
    projectType: "custom",
    enableFindRelatedTests: true,
  },
  // Scope: security/business-critical PURE logic with fast, no-DB server tests.
  // The DB-heavy features/**/actions.ts + queries.ts (and DB-backed lib modules like
  // auditOutbox / featureFlag) are intentionally excluded — mutating them ran ~8h
  // (6049 mutants × DB-backed tests at maxWorkers:1), far past CI's 6h job limit, so
  // the check could never complete. Those paths stay covered by the full server test
  // suite; this run mutation-tests deterministic pure logic and finishes in minutes.
  mutate: [
    "src/permissions.ts",
    "src/actionErrors.ts",
    "src/lib/actionUtils.ts",
    "src/lib/auditHashChain.ts",
    "src/lib/ical.ts",
    "src/lib/totpCrypto.ts",
    "src/lib/logger.ts",
    "!src/**/*.d.ts",
  ],
  reporters: ["progress", "html", "dashboard"],
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
  // Run mutation testing in-place so the existing Next.js / SWC TypeScript
  // transforms work correctly without needing a separate Babel config.
  inPlace: true,
  coverageAnalysis: "perTest",
  // Allow 2× the normal Jest timeout per mutant
  timeoutFactor: 2,
  // Fail the run if mutation score drops below this threshold
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  tempDirName: ".stryker-tmp",
  cleanTempDir: "always",
};

export default config;
