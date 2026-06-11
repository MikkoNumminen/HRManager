---
name: i18n
description: Add or change user-facing strings and error codes across the 18 locales — key placement, the sync/translate commands, the pre-push block loop, terminology consistency, and the ErrorCode↔i18n coupling. Use when adding UI text, a new ActionError code, or when the pre-push hook blocks on untranslated keys.
---

# i18n: 18 locales, en.json is the source of truth

Locales: `messages/{en,ar,de,es,fi,fr,hi,ja,ko,pl,pt,ru,sv,sw,th,tr,uk,zh}.json`.
Keys live in feature-shaped top-level namespaces (`persons`, `errors`,
`featureFlags`, …). `scripts/i18n-sync.ts` treats `en.json` as canonical.

```bash
npm run i18n:audit       # report missing / extra / untranslated across locales
npm run i18n:fix         # fill missing keys with English fallback AND delete
                         # keys absent from en.json — destructive to locale-only keys
npm run i18n:translate   # auto-translate via API (needs ANTHROPIC_API_KEY) —
                         # translating by hand is equally fine
```

The audit's "~17 untranslated" baseline is known false positives; the pre-push
hook blocks only above 25. Don't chase the baseline.

## Adding a string

1. Add the key + English text to the right namespace in `messages/en.json`.
2. Add real translations to the other 17 locales (`i18n:translate` or by hand).
3. **Terminology first**: before translating a domain word, grep that locale's
   file for how the EXISTING namespace translates it and reuse that term —
   e.g. de says `Funktionsschalter` for "feature flag", not "Feature-Flag".
   Inconsistent terms across namespaces are a real reviewable defect here.
4. Style: terse and impersonal, matching neighbors ("Nicht authentifiziert",
   not full sentences with du/Sie).
5. `npm run i18n:audit` → expect "0 missing, 0 extra".

## Adding an ActionError code (coupled procedure)

`ErrorCode` (`src/actionErrors.ts`) is a MANUAL union. A new code needs all of:

1. The union member in `src/actionErrors.ts`.
2. An `errors.<code>` key in `messages/en.json` — CI gate: `npm run
check:error-codes` fails without it.
3. Translations in the 17 other locales (step list above).
4. Throw it as `new ActionError("<code>", t("<code>"))` inside the action.

Miss (1) and `next build` fails on the type; miss (2) and CI fails; miss (3)
and the keys count toward the pre-push untranslated threshold.

## When the pre-push hook blocks

This is the designed loop, not an error. The hook has TWO independent block
paths — read its output to know which fired:

- **"Auto-fixing with English fallback"** (missing keys existed): the hook ran
  `i18n:fix`, so English fallbacks are now in the locale files, _uncommitted_.
  Translate them (17 locales, terminology rule above), commit, push again.
- **"untranslated keys detected" (>25)**: nothing was modified — the
  English-identical values are already _committed_. `npm run i18n:audit` lists
  them; translate, commit, push again.

Do not bypass with `--no-verify`; that ships English text to 17 locales.
