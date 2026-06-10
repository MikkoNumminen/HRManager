// Guard: every ErrorCode union member must have an errors.* key in messages/en.json.
//
// ErrorCode (src/actionErrors.ts) is a MANUAL union, and ActionError messages are
// resolved via getTranslations("errors") at runtime. The type system catches an
// unknown code at build time, but a union member with no i18n key only fails at
// runtime (MISSING_MESSAGE) when that error path triggers. This script closes the
// loop in CI for en.json (the i18n source of truth); the other 17 locales are
// synced from it by scripts/i18n-sync.ts, which runs advisorily in `validate`
// and blocks in the pre-push hook above its untranslated-keys threshold.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Strip // and /* */ comments before matching: a semicolon inside a comment must
// not terminate the union early (union members are plain quoted identifiers, so
// after stripping, the first ';' genuinely ends the type).
const source = readFileSync(join(root, "src/actionErrors.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");
const unionMatch = source.match(/export type ErrorCode =([\s\S]*?);/);
if (!unionMatch) {
  console.error("check-error-codes: could not locate the ErrorCode union in src/actionErrors.ts");
  process.exit(1);
}
const codes = [...unionMatch[1].matchAll(/"([a-zA-Z0-9_]+)"/g)].map((m) => m[1]);

// Sanity floor: if extraction yields implausibly few codes, the union was probably
// refactored (e.g. to a derived type) and this gate would otherwise rot into a
// silent no-op. Update the floor alongside any intentional restructuring.
const MIN_EXPECTED_CODES = 50;
if (codes.length < MIN_EXPECTED_CODES) {
  console.error(
    `check-error-codes: extracted only ${codes.length} ErrorCode members (expected >= ${MIN_EXPECTED_CODES}).\n` +
      "src/actionErrors.ts was probably restructured — update this script's extraction to match.",
  );
  process.exit(1);
}

const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
const errorKeys = new Set(Object.keys(en.errors ?? {}));

const missing = codes.filter((c) => !errorKeys.has(c));
if (missing.length > 0) {
  console.error(
    `check-error-codes: ${missing.length} ErrorCode member(s) have no errors.* key in messages/en.json:\n` +
      missing.map((c) => `  - ${c}`).join("\n") +
      "\nAdd the key(s) to messages/en.json (then run npm run i18n:translate for the other locales).",
  );
  process.exit(1);
}
console.log(`check-error-codes: OK — all ${codes.length} ErrorCode members have errors.* keys.`);
