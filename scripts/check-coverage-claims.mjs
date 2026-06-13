// Coverage-claim drift gate.
//
// README.md advertises coverage numbers in two places that nothing regenerated:
//   • the **Total** row of the test table — "<lines>% line coverage · <functions>% function coverage" (1 decimal)
//   • a plain-text block — "Statements : .. Branches : .. / Functions : .. Lines : .." (2 decimals)
// They could silently drift from reality. This validates both against the live
// coverage/coverage-summary.json that `npm run test:all -- --coverage` produces.
//
// In CI: runs right after the coverage step, so the JSON is fresh. Locally with
// no coverage run yet, it SKIPS (exit 0) with a note rather than failing — run
// `npm run test:all -- --coverage` first to check locally.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const summaryPath = join(root, "coverage", "coverage-summary.json");

if (!existsSync(summaryPath)) {
  console.log(
    "check-coverage-claims: skipped — no coverage/coverage-summary.json. " +
      "Run `npm run test:all -- --coverage` first (CI always has it).",
  );
  process.exit(0);
}

const total = JSON.parse(readFileSync(summaryPath, "utf8")).total;
const readme = readFileSync(join(root, "README.md"), "utf8");

const pct = (metric, dp) => total[metric].pct.toFixed(dp);
const grab = (re, label) => {
  const m = readme.match(re);
  if (!m) {
    console.error(`check-coverage-claims: could not find ${label} in README.md`);
    process.exit(1);
  }
  return m[1];
};

// README claim  -> (metric, decimals, regex capturing the claimed number)
const checks = [
  ["Total-row line %", "lines", 1, /([\d.]+)% line coverage ·/],
  ["Total-row function %", "functions", 1, /· ([\d.]+)% function coverage/],
  ["block Statements", "statements", 2, /Statements\s*:\s*([\d.]+)%/],
  ["block Branches", "branches", 2, /Branches\s*:\s*([\d.]+)%/],
  ["block Functions", "functions", 2, /Functions\s*:\s*([\d.]+)%/],
  ["block Lines", "lines", 2, /Lines\s*:\s*([\d.]+)%/],
];

const drift = [];
for (const [label, metric, dp, re] of checks) {
  const claimed = grab(re, label);
  const actual = pct(metric, dp);
  if (claimed !== actual) drift.push(`  ${label}: README says ${claimed}%, actual ${actual}%`);
}

if (drift.length) {
  console.error(
    `check-coverage-claims: README coverage numbers are stale:\n${drift.join("\n")}\n\n` +
      `Update README.md to match coverage/coverage-summary.json ` +
      `(lines ${pct("lines", 2)} / functions ${pct("functions", 2)} / ` +
      `statements ${pct("statements", 2)} / branches ${pct("branches", 2)}).`,
  );
  process.exit(1);
}

console.log("check-coverage-claims: OK — README coverage numbers match coverage-summary.json.");
