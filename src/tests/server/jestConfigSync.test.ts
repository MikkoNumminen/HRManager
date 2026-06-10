import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guard against drift between the main server jest config and the Stryker copy.
// jest.config.stryker.mjs is a flat duplicate of jest.config.server.ts (Stryker
// needs a JSON-serialisable config); when a module mock is added to the server
// config but not mirrored (as happened with pg-boss), Stryker's dry run fails
// with "Cannot use import statement outside a module". This test reads both
// files as text and asserts the mock/transform sections stay in sync.

const root = join(__dirname, "..", "..", "..");
const serverConfig = readFileSync(join(root, "jest.config.server.ts"), "utf8");
const strykerConfig = readFileSync(join(root, "jest.config.stryker.mjs"), "utf8");

// Extract the full "pattern": "target" pairs from a config's moduleNameMapper block
// (any quoted key, not just ^-anchored ones — and values too, so repointing a mock
// in one file without the other is caught, not just adding/removing one).
// Known limitation: only string-valued entries are compared; an array-valued mapper
// ("pattern": ["a", "b"]) on the SERVER side would be skipped — if you ever add one,
// extend this extraction alongside it.
function mapperEntries(source: string): Map<string, string> {
  const block = source.match(/moduleNameMapper:\s*\{([\s\S]*?)\n\s*\}/);
  if (!block) return new Map();
  return new Map(
    [...block[1].matchAll(/"((?:[^"\\]|\\.)+)":\s*"((?:[^"\\]|\\.)+)"/g)].map((m) => [m[1], m[2]]),
  );
}

describe("jest.config.stryker.mjs stays in sync with jest.config.server.ts", () => {
  // Every module mocked for server tests must be mirrored — same pattern AND same
  // target — for Stryker's dry run.
  test("every server moduleNameMapper entry exists in the stryker config with the same target", () => {
    const server = mapperEntries(serverConfig);
    const stryker = mapperEntries(strykerConfig);
    expect(server.size).toBeGreaterThan(0);
    const drift = [...server.entries()]
      .filter(([key, target]) => stryker.get(key) !== target)
      .map(
        ([key, target]) => `${key}: server="${target}" stryker="${stryker.get(key) ?? "(absent)"}"`,
      );
    expect(drift).toEqual([]);
  });

  // The ESM transform allowlist must match, or Prisma's .mjs files break under Stryker.
  test("transformIgnorePatterns match", () => {
    const pattern = /transformIgnorePatterns:\s*\[([^\]]*)\]/;
    const server = serverConfig.match(pattern)?.[1]?.trim();
    const stryker = strykerConfig.match(pattern)?.[1]?.trim();
    expect(server).toBeTruthy();
    expect(stryker).toBe(server);
  });
});
