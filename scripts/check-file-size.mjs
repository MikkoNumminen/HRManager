// File-size ratchet.
//
// Big files are hard for an agent to hold in context and reason about safely.
// There's a soft ~300-LOC cap (AGENTS.md / the rating doc); this enforces it as
// a CI ratchet: it counts PRODUCTION source files over the cap and fails when
// that count grows past BASELINE, so new monoliths can't accrete (and the count
// can only ratchet down). It does NOT force existing large files to split —
// each over-cap file is a documented, accepted exception until refactored.
//
// Scope: `.ts`/`.tsx` under `src/`, excluding `__tests__/` and `*.test.*`.
//
// count > BASELINE — a file crossed the cap (or a new big file landed). Split it,
//   or, if justified, raise BASELINE here and say why in the PR.
// count < BASELINE — you shrank/removed a big file (nice); lower BASELINE to lock
//   the gain in. This only WARNS (exit 0).
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const CAP = 300;
const BASELINE = 8; // production files currently over CAP; ratchet only downward.

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const over = [];
for (const file of walk(srcDir)) {
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > CAP) over.push({ file: relative(root, file), lines });
}
over.sort((a, b) => b.lines - a.lines);

console.log(
  `check-file-size: ${over.length} production file(s) over ${CAP} LOC (baseline ${BASELINE}).`,
);
for (const o of over) console.log(`  ${o.lines}  ${o.file}`);

if (over.length > BASELINE) {
  console.error(
    `\nFile-size regression: ${over.length} > baseline ${BASELINE}. A file crossed the ` +
      `${CAP}-LOC cap. Split it into per-concern modules (see the reviews/admin/leave actions/ ` +
      `split for the pattern), or raise BASELINE in scripts/check-file-size.mjs with a justification.`,
  );
  process.exit(1);
}
if (over.length < BASELINE) {
  console.warn(
    `\nFile-size improved: ${over.length} < baseline ${BASELINE}. ` +
      `Lower BASELINE to ${over.length} in scripts/check-file-size.mjs to lock the gain in.`,
  );
  process.exit(0);
}
console.log("OK — file-size held at baseline.");
