// Feature-module boundary ratchet.
//
// Feature isolation (each `src/features/<x>/` is self-contained) is enforced by
// review + docs only — nothing mechanical stops one feature from deep-importing
// another's internals (AGENTS.md "Architecture rules": prefer the root barrels
// `@/serverActions` / `@/queries` / `@/schemas`, and put shared UI in
// `src/components/shared/`). This script makes that boundary a CI ratchet: it
// counts cross-feature imports in PRODUCTION feature code and fails when the
// count grows past BASELINE, so coupling can't silently increase.
//
// Scope: it polices feature→feature coupling only — imports from `src/app/` or
// `src/components/` into a feature's internals are out of scope (the barrels are
// the contract for those). Files scanned: `.ts/.tsx/.js/.jsx/.mjs/.cjs` under
// `src/features/`, excluding `__tests__/` and `*.test.*` (integration tests may
// legitimately span features). A cross-feature import is one that targets a
// DIFFERENT feature, via either the `@/features/<other>` alias OR a relative
// path that resolves under `src/features/<other>/`. Comments are stripped first
// so a feature path mentioned in prose isn't miscounted. Type-only imports count
// — they document the same coupling intent.
//
// When this fails:
//   • count > BASELINE — you added cross-feature coupling. Route the import
//     through a root barrel (`@/serverActions` / `@/queries` / `@/schemas`), or
//     move shared UI to `src/components/shared/`. If it is genuinely necessary,
//     raise BASELINE below and say why in the PR.
//   • count < BASELINE — you removed coupling (nice). This only WARNS (exit 0);
//     lower BASELINE to the new number to lock the gain in.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const featuresDir = join(root, "src", "features");

// Cross-feature imports allowed in production feature code today. A ratchet:
// only ever lower this (with the refactor that earns it). See file header.
const BASELINE = 16;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      out.push(...walk(full));
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name) && !/\.test\.\w+$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Remove block/JSDoc and line comments so a feature path mentioned in prose
// isn't counted as a real import. Heuristic (no full parse): good enough for an
// import-graph ratchet; the `[^:"'`\\]` guard skips `://` and most in-string `//`.
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

// The other feature a specifier targets, or null (same-feature / external / lib).
function crossFeatureTarget(spec, fileDir, ownFeature) {
  let target = null;
  const alias = spec.match(/^@\/features\/([\w-]+)/);
  if (alias) {
    target = alias[1];
  } else if (spec.startsWith(".")) {
    const rel = relative(featuresDir, resolve(fileDir, spec));
    if (rel && !rel.startsWith("..") && !rel.startsWith(sep)) {
      target = rel.split(/[/\\]/)[0];
    }
  }
  return target && target !== ownFeature ? target : null;
}

const FROM_RE = /\bfrom\s*["']([^"']+)["']/g; // import/export ... from "x"
const SIDE_RE = /^[ \t]*import\s+["']([^"']+)["'][ \t]*;?[ \t]*$/gm; // side-effect import "x"

const violations = [];
for (const file of walk(featuresDir)) {
  const ownFeature = relative(featuresDir, file).split(/[/\\]/)[0];
  const fileDir = dirname(file);
  const src = stripComments(readFileSync(file, "utf8"));
  for (const re of [FROM_RE, SIDE_RE]) {
    for (const m of src.matchAll(re)) {
      const target = crossFeatureTarget(m[1], fileDir, ownFeature);
      if (!target) continue;
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({ file: relative(root, file), line, from: ownFeature, to: target });
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
  // Improvement — nudge, but don't fail an unrelated PR that incidentally
  // removed coupling. Lowering BASELINE is a deliberate, separate edit.
  console.warn(
    `\nBoundaries improved: ${count} < baseline ${BASELINE}. ` +
      `Lower BASELINE to ${count} in scripts/check-feature-boundaries.mjs to lock the gain in.`,
  );
  process.exit(0);
}

console.log("OK — feature boundaries held at baseline.");
