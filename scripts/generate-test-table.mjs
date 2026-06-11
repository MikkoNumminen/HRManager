// Regenerates the per-layer test table in README.md from what the suites actually
// report. The hand-maintained table drifted by ~1000 tests once; this measures
// instead. Jest counts come from `npm run test:all` with JSON output (that script
// already loads .env.test and pushes the schema to the test Postgres), Playwright
// from `npx playwright test --list`. Files are grouped into a few coarse path-based
// rows on purpose — per-feature rows are what drifted. Only the region between the
// test-table markers is rewritten; the coverage cell in the Total row is carried
// over verbatim from the existing README, never recomputed here.
//
// Manual maintenance tool (not in validate/CI): npm run readme:test-table
// Needs the test Postgres from .env.test running; the Jest suite takes ~3-5 min.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function die(msg) {
  console.error(`generate-test-table: ${msg}`);
  process.exit(1);
}

// Every Jest test file must match exactly one row; an unmatched file is a hard
// error so new test locations can't silently vanish from the README.
const GROUPS = [
  {
    layer: "Feature component tests",
    test: (p) => /^src\/features\/[^/]+\/__tests__\//.test(p),
    covers:
      "Per-feature UI + actions: persons, teams, departments, admin, reviews, realtime, leave, employee, 2FA, dashboard, reports",
  },
  {
    layer: "Shared component tests",
    test: (p) => /^src\/components\/.*\/__tests__\//.test(p),
    covers:
      "Reusable components shared across features: LeaveManager tabs (types, balances, requests)",
  },
  {
    layer: "Shared suites (a11y, schemas, permissions)",
    test: (p) => p.startsWith("src/tests/shared/"),
    covers:
      "Cross-cutting: axe-core WCAG AA, Zod schemas, RBAC permissions, i18n, themes, telemetry, tutorial, middleware",
  },
  {
    layer: "Server integration",
    test: (p) => p.startsWith("src/tests/server/"),
    covers:
      "Real PostgreSQL + MongoDB — server actions, queries, auth, audit hash chain, rate limiting, health, sessions",
  },
  {
    layer: "Jobs",
    test: (p) => p.startsWith("src/tests/jobs/"),
    covers: "pg-boss queue setup and worker registration, retries, dead-letter handling",
  },
];

const jestJsonPath = join(tmpdir(), `jest-results-${process.pid}.json`);
console.log("generate-test-table: running Jest via `npm run test:all` (takes ~3-5 min)...");
// --forceExit: the suite leaves open handles locally, so Jest hangs after "Test
// results written to ..." and ends via SIGTERM. The JSON file is flushed before
// the force exit, and pass/fail is judged from its `success` flag — the exit code
// of a force-exited run is not meaningful.
const jest = spawnSync(
  "npm",
  ["run", "test:all", "--", "--json", `--outputFile=${jestJsonPath}`, "--silent", "--forceExit"],
  { cwd: root, stdio: ["ignore", "inherit", "inherit"] },
);

// The tmp path is unique per run, so a parseable file here is from THIS run.
let jestResults;
try {
  jestResults = JSON.parse(readFileSync(jestJsonPath, "utf8"));
} catch (err) {
  die(`Jest run produced no parseable JSON (exit ${jest.status ?? jest.signal}): ${err.message}`);
}
rmSync(jestJsonPath, { force: true });
if (jestResults.success !== true) {
  die(
    `Jest reported failures (${jestResults.numFailedTests} failed, ${jestResults.numTotalTests} total) — fix the suite before regenerating the table.`,
  );
}

const counts = new Map(GROUPS.map((g) => [g.layer, 0]));
let jestTotal = 0;
for (const file of jestResults.testResults) {
  const rel = relative(root, file.name).split(sep).join("/");
  const group = GROUPS.find((g) => g.test(rel));
  if (!group) die(`no row group matches test file ${rel} — add it to GROUPS.`);
  counts.set(group.layer, counts.get(group.layer) + file.assertionResults.length);
  jestTotal += file.assertionResults.length;
}
if (jestTotal === 0) die("Jest reported 0 tests — refusing to write an empty table.");
if (jestTotal !== jestResults.numTotalTests) {
  die(
    `per-file counts sum to ${jestTotal} but Jest reports numTotalTests=${jestResults.numTotalTests}.`,
  );
}

console.log("generate-test-table: listing Playwright tests...");
const pw = spawnSync("npx", ["playwright", "test", "--list"], { cwd: root, encoding: "utf8" });
if (pw.status !== 0)
  die(`\`npx playwright test --list\` failed (exit ${pw.status ?? pw.signal}):\n${pw.stderr}`);
const pwMatch = pw.stdout.match(/^Total: (\d+) tests? in \d+ files?$/m);
if (!pwMatch) die('could not find "Total: N tests in M files" in Playwright --list output.');
const e2eTotal = Number(pwMatch[1]);

const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");
const START = "<!-- test-table:generated:start -->";
const END = "<!-- test-table:generated:end -->";
const startIdx = readme.indexOf(START);
const endIdx = readme.indexOf(END);
if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  die(`README.md is missing the ${START} / ${END} markers (or they are out of order).`);
}
const region = readme.slice(startIdx + START.length, endIdx);

// Coverage is maintained separately (coverage/coverage-summary.json) — carry the
// existing Total-row cell over verbatim so this script never invents numbers.
const totalLine = region.split("\n").find((line) => line.startsWith("| **Total**"));
if (!totalLine)
  die("no `| **Total**` row inside the marked region to read the coverage cell from.");
const coverageCell = totalLine.split("|").map((c) => c.trim())[3];
if (!coverageCell)
  die("could not parse the coverage cell (third column) from the existing **Total** row.");

const rows = [
  ["Layer", "Tests", "What it covers"],
  ...GROUPS.map((g) => [g.layer, String(counts.get(g.layer)), g.covers]),
  [
    "E2E (Playwright)",
    String(e2eTotal),
    "Auth, CRUD, detail editing, dashboard, profile, data I/O, form validation, full workflow",
  ],
  [
    "**Total**",
    `**${jestTotal + e2eTotal}** (${jestTotal} Jest + ${e2eTotal} Playwright)`,
    coverageCell,
  ],
];

// Pad columns the way Prettier formats markdown tables so --check stays green.
const widths = rows[0].map((_, i) => Math.max(3, ...rows.map((r) => r[i].length)));
const fmtRow = (r) => `| ${r.map((cell, i) => cell.padEnd(widths[i])).join(" | ")} |`;
const table = [
  fmtRow(rows[0]),
  `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`,
  ...rows.slice(1).map(fmtRow),
].join("\n");

writeFileSync(
  readmePath,
  readme.slice(0, startIdx + START.length) + `\n\n${table}\n\n` + readme.slice(endIdx),
);

console.log("generate-test-table: README.md updated.");
for (const g of GROUPS) console.log(`  ${g.layer}: ${counts.get(g.layer)}`);
console.log(`  E2E (Playwright): ${e2eTotal}`);
console.log(`  Total: ${jestTotal + e2eTotal} (${jestTotal} Jest + ${e2eTotal} Playwright)`);
