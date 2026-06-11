---
name: verify
description: Verify code changes before committing or pushing — the exact gate ladder (lint, type-check, targeted tests, full suite), the single-suite rule for the shared test DB, and the known flaky suites. Use after any code change, before any push, or when a test failure needs triage.
---

# Verify: the gate ladder

Run the cheap gates first; each one catches what the previous can't. All commands
from the repo root.

```bash
npx eslint <changed files>          # 1. lint (scoped — full lint is slow)
npm run typecheck                   # 2. tsc --noEmit. NON-NEGOTIABLE: jest is
                                    #    transpile-only; skipping this means type
                                    #    errors surface only in next build (CI's
                                    #    last step). Repo is kept at 0 errors.
npm run check:error-codes           # 3. only if ErrorCode / messages changed
npm run test:all -- <pattern>       # 4. targeted tests (see mapping below)
npm run test:all                    # 5. full suite before push (~3-5 min)
```

Prettier is enforced by lint-staged on commit — don't run it manually unless a
non-commit path (e.g. a script writing files) produced output.

## Targeted-test mapping

Test files are named after BEHAVIOR or the singular entity, not the source
file — resolve the real name first, then run it:

| You changed                                   | Find the test                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/<f>/actions.ts` or `queries.ts` | `ls src/tests/server/serverActions.*` — names are singular (`persons` → `serverActions.person`); featureFlags/jobs/sessions have no file there — grep the action name under `src/tests/` instead |
| `src/features/<f>/components/*`               | `ls src/features/<f>/__tests__/` — behavior-named (AddTeamForm → `AddTeam.test`); never assume `<ComponentName>.test` exists                                                                     |
| `src/lib/*`, `src/auditLog.ts`                | same-named `src/tests/server/<name>.test.ts` exists for ~half; the rest are covered via `src/tests/shared/` or feature suites — `grep -rl <module> src/tests/`                                   |
| `src/jobs/*`                                  | `npm run test:all -- drain.test queue.test`                                                                                                                                                      |
| jest configs                                  | `npm run test:all -- jestConfigSync`                                                                                                                                                             |
| `messages/*.json`, `src/actionErrors.ts`      | `npm run check:error-codes` + `npm run i18n:audit`                                                                                                                                               |

## The single-suite rule (hard)

All server tests share ONE test Postgres (`.env.test`). Two suites running
concurrently corrupt each other's fixtures → dozens of phantom failures.

- Before any suite: `pgrep -f "jest --config" || true` — if something is
  running, wait or kill the orphan.
- NEVER let a spawned subagent run `npm run test:all` while the main session
  might; centralize suite runs in one place.

## Known flaky-under-load suites

`accessibility.test`, `TwoFactorSetup.test`, `ChangePosition.test` time out
when the machine is loaded (other suites, Stryker, heavy builds). A failure
there during a busy run is not a signal — rerun the file in isolation before
investigating: `npm run test:all -- <name>` → if green alone, it was load.

## What the push itself runs

The pre-push hook re-runs the i18n audit (blocks >25 untranslated keys — see
the `i18n` skill for the unblock loop) and the full suite. Budget ~5 min per
push; don't push twice in parallel.
