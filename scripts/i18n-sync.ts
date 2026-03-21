/**
 * i18n Translation Sync Agent
 *
 * Compares all locale files against en.json (source of truth).
 * Reports missing keys, extra keys, and untranslated values.
 *
 * Usage:
 *   npx tsx scripts/i18n-sync.ts          # audit only
 *   npx tsx scripts/i18n-sync.ts --fix    # auto-fill missing keys with English fallback
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(__dirname, "..", "messages");
const SOURCE_LOCALE = "en";

interface TranslationMap {
  [key: string]: string | TranslationMap;
}

/** Flatten nested JSON into dot-separated keys */
function flattenKeys(obj: TranslationMap, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      for (const [k, v] of flattenKeys(value as TranslationMap, path)) {
        result.set(k, v);
      }
    } else {
      result.set(path, String(value));
    }
  }
  return result;
}

/** Set a dot-separated key in a nested object */
function setNestedKey(obj: TranslationMap, dotKey: string, value: string): void {
  const parts = dotKey.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as TranslationMap;
  }
  current[parts[parts.length - 1]] = value;
}

/** Remove a dot-separated key from a nested object */
function removeNestedKey(obj: TranslationMap, dotKey: string): void {
  const parts = dotKey.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) return;
    current = current[parts[i]] as TranslationMap;
  }
  delete current[parts[parts.length - 1]];
}

interface LocaleReport {
  locale: string;
  missing: string[];
  extra: string[];
  untranslated: string[];
}

function auditLocale(sourceKeys: Map<string, string>, locale: string): LocaleReport {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  const content = JSON.parse(readFileSync(filePath, "utf-8")) as TranslationMap;
  const localeKeys = flattenKeys(content);

  const missing: string[] = [];
  const untranslated: string[] = [];
  const extra: string[] = [];

  // Find missing and untranslated keys
  for (const [key, enValue] of sourceKeys) {
    if (!localeKeys.has(key)) {
      missing.push(key);
    } else if (localeKeys.get(key) === enValue && locale !== SOURCE_LOCALE) {
      // Value identical to English — likely untranslated (skip short values like "-")
      if (enValue.length > 2) {
        untranslated.push(key);
      }
    }
  }

  // Find extra keys not in source
  for (const key of localeKeys.keys()) {
    if (!sourceKeys.has(key)) {
      extra.push(key);
    }
  }

  return { locale, missing, extra, untranslated };
}

function fixLocale(
  sourceKeys: Map<string, string>,
  report: LocaleReport,
): { added: number; removed: number } {
  const filePath = join(MESSAGES_DIR, `${report.locale}.json`);
  const content = JSON.parse(readFileSync(filePath, "utf-8")) as TranslationMap;

  // Add missing keys with English fallback
  for (const key of report.missing) {
    setNestedKey(content, key, sourceKeys.get(key)!);
  }

  // Remove extra keys
  for (const key of report.extra) {
    removeNestedKey(content, key);
  }

  writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n", "utf-8");
  return { added: report.missing.length, removed: report.extra.length };
}

// --- Main ---

const fix = process.argv.includes("--fix");

const sourceContent = JSON.parse(
  readFileSync(join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`), "utf-8"),
) as TranslationMap;
const sourceKeys = flattenKeys(sourceContent);

const localeFiles = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json") && f !== `${SOURCE_LOCALE}.json`)
  .map((f) => f.replace(".json", ""))
  .sort();

console.log(`\nSource: ${SOURCE_LOCALE}.json (${sourceKeys.size} keys)\n`);

let totalMissing = 0;
let totalExtra = 0;
let totalUntranslated = 0;
let hasIssues = false;

for (const locale of localeFiles) {
  const report = auditLocale(sourceKeys, locale);
  const issues = report.missing.length + report.extra.length + report.untranslated.length;

  if (issues === 0) {
    console.log(`  ${locale}: OK`);
    continue;
  }

  hasIssues = true;
  console.log(`  ${locale}:`);

  if (report.missing.length > 0) {
    totalMissing += report.missing.length;
    console.log(`    Missing (${report.missing.length}):`);
    for (const key of report.missing) {
      console.log(`      + ${key}`);
    }
  }

  if (report.extra.length > 0) {
    totalExtra += report.extra.length;
    console.log(`    Extra (${report.extra.length}):`);
    for (const key of report.extra) {
      console.log(`      - ${key}`);
    }
  }

  if (report.untranslated.length > 0) {
    totalUntranslated += report.untranslated.length;
    console.log(`    Untranslated (${report.untranslated.length}):`);
    for (const key of report.untranslated) {
      console.log(`      ~ ${key}`);
    }
  }

  if (fix && (report.missing.length > 0 || report.extra.length > 0)) {
    const result = fixLocale(sourceKeys, report);
    console.log(`    Fixed: +${result.added} added, -${result.removed} removed`);
  }
}

console.log(
  `\nSummary: ${totalMissing} missing, ${totalExtra} extra, ${totalUntranslated} untranslated across ${localeFiles.length} locales`,
);

if (fix && hasIssues) {
  console.log("Applied fixes (missing keys filled with English fallback, extra keys removed)");
  console.log("Note: Keys filled with English text still need proper translation.");
}

process.exit(hasIssues && !fix ? 1 : 0);
