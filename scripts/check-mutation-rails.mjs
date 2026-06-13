// Mutation-rails guard.
//
// Every server action must pass through an authorization gate — there is no
// sanctioned un-authed mutation. The two documented patterns both qualify:
//   - the guardedAction() wrapper (does requirePermission + rateLimit), or
//   - the inline pattern with an explicit requirePermission()/requireAdminIp()/
//     auth() call in the action body.
// This fails CI if an exported action in a feature actions module has NONE of
// those in its block, so an agent can't ship a mutation that skips auth.
//
// Scope: exported actions in src/features/<x>/actions.ts and
// src/features/<x>/actions/<group>.ts (excluding the index re-export barrels and
// test files).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const featuresDir = join(root, "src", "features");

// An action's block "has a gate" if it references any of these.
const GATE = /\b(?:guardedAction|requirePermission|requireAdminIp|auth)\s*\(/;
const EXPORT = /^export (?:async function|const) ([A-Za-z0-9_]+)/gm;

function actionFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...actionFiles(full));
      continue;
    }
    const rel = relative(featuresDir, full).split(/[/\\]/);
    // <feature>/actions.ts  OR  <feature>/actions/<group>.ts (not index, not tests)
    const isActionsFile =
      rel[1] === "actions.ts" || (rel[1] === "actions" && rel[2] && rel[2] !== "index.ts");
    if (isActionsFile && /\.tsx?$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

const ungated = [];
for (const file of actionFiles(featuresDir)) {
  const src = readFileSync(file, "utf8");
  const starts = [];
  for (const m of src.matchAll(EXPORT)) starts.push({ name: m[1], index: m.index });
  for (let i = 0; i < starts.length; i++) {
    const block = src.slice(
      starts[i].index,
      i + 1 < starts.length ? starts[i + 1].index : src.length,
    );
    if (!GATE.test(block)) {
      const line = src.slice(0, starts[i].index).split("\n").length;
      ungated.push(`  ${relative(root, file)}:${line}  ${starts[i].name}`);
    }
  }
}

if (ungated.length) {
  console.error(
    `check-mutation-rails: ${ungated.length} exported action(s) with no auth gate ` +
      `(guardedAction / requirePermission / requireAdminIp / auth):\n${ungated.join("\n")}\n\n` +
      "Every mutation must be authorized. Wrap it in guardedAction(), or add an explicit " +
      "requirePermission()/auth() check (see AGENTS.md → mutation patterns).",
  );
  process.exit(1);
}

console.log("check-mutation-rails: OK — every exported action passes an auth gate.");
