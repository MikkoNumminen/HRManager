// Feature-module boundary ratchet.
//
// Feature isolation (each `src/features/<x>/` is self-contained) is enforced by
// review + docs only — nothing mechanical stops one feature from deep-importing
// another's internals (AGENTS.md "Architecture rules": prefer the root barrels
// `@/serverActions` / `@/queries` / `@/schemas`, and put shared UI in
// `src/components/shared/`). This script makes that boundary a CI ratchet: it
// counts cross-feature `@/features/<other>` imports in PRODUCTION feature code
// and fails when the count drifts from BASELINE, so coupling can't silently grow
// (and improvements get locked in).
//
// Scope: `.ts`/`.tsx` under `src/features/`, excluding `__tests__/` and
// `*.test.*` (integration tests may legitimately span features). Type-only
// imports still count — they document the same coupling intent.
//
// When this fails:
//   • count > BASELINE — you added cross-feature coupling. Route the import
//     through a root barrel (`@/serverActions` / `@/queries` / `@/schemas`), or
//     move shared UI to `src/components/shared/`. If it is genuinely necessary,
//     bump BASELINE below and say why in the PR.
//   • count < BASELINE — you removed coupling (nice). Lower BASELINE to the new
//     number to lock the gain in.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const featuresDir = join(root, "src", "features");

// Cross-feature imports allowed in production feature code today. A ratchet:
// only ever lower this (with the refactor that earns it). See file header.
const BASELINE = 19;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Matches `from "@/features/<name>"` / `from '@/features/<name>/...'` in both
// `import ... from` and `export ... from` statements.
const IMPORT_RE = /\bfrom\s+["']@\/features\/([a-zA-Z0-9_-]+)/g;

const violations = [];
for (const file of walk(featuresDir)) {
  // own feature = first path segment under src/features/
  const ownFeature = relative(featuresDir, file).split(/[/\\]/)[0];
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const target = m[1];
    if (target !== ownFeature) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({
        file: relative(root, file),
        line,
        from: ownFeature,
        to: target,
      });
    }
  }
}

const count = violations.length;
const byPair = {};
for (const v of violations) {
  const k = `${v.from} → ${v.to}`;
  byPair[k] = (byPair[k] ?? 0) + 1;
}

console.log(`check-feature-boundaries: ${count} cross-feature import(s) (baseline ${BASELINE}).`);
for (const [pair, n] of Object.entries(byPair).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pair}: ${n}`);
}

if (count > BASELINE) {
  console.error(
    `\nBoundary regression: ${count} > baseline ${BASELINE}. ` +
      `New cross-feature coupling was added:\n` +
      violations.map((v) => `  ${v.file}:${v.line}  (${v.from} → ${v.to})`).join("\n") +
      `\n\nRoute the import through a root barrel (@/serverActions / @/queries / ` +
      `@/schemas) or move shared UI to src/components/shared/. ` +
      `If it is genuinely necessary, raise BASELINE in scripts/check-feature-boundaries.mjs and justify it in the PR.`,
  );
  process.exit(1);
}

if (count < BASELINE) {
  console.error(
    `\nBoundaries improved: ${count} < baseline ${BASELINE}. ` +
      `Lower BASELINE to ${count} in scripts/check-feature-boundaries.mjs to lock the gain in.`,
  );
  process.exit(1);
}

console.log("OK — feature boundaries held at baseline.");
