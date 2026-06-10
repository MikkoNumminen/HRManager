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

// Extract the mapped module names (the keys of moduleNameMapper) from a config source.
function mapperKeys(source: string): string[] {
  const block = source.match(/moduleNameMapper:\s*\{([\s\S]*?)\n\s*\}/);
  if (!block) return [];
  return [...block[1].matchAll(/"(\^[^"]+\$?)":/g)].map((m) => m[1]);
}

describe("jest.config.stryker.mjs stays in sync with jest.config.server.ts", () => {
  // Every module mocked for server tests must be mirrored for Stryker's dry run.
  test("every server moduleNameMapper entry exists in the stryker config", () => {
    const serverKeys = mapperKeys(serverConfig);
    const strykerKeys = new Set(mapperKeys(strykerConfig));
    expect(serverKeys.length).toBeGreaterThan(0);
    const missing = serverKeys.filter((k) => !strykerKeys.has(k));
    expect(missing).toEqual([]);
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
