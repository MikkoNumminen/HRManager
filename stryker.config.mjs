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
  // Only mutate critical business-logic source files
  mutate: [
    "src/lib/**/*.ts",
    "src/features/**/actions.ts",
    "src/features/**/queries.ts",
    "src/schemas.ts",
    "src/permissions.ts",
    "src/actionErrors.ts",
    // Exclusions
    "!src/generated/**",
    "!src/tests/**",
    "!**/*.d.ts",
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
