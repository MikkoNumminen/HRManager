# HRManager – Claude Code Rules

> The canonical, vendor-neutral agent contract is **[`AGENTS.md`](AGENTS.md)** —
> read it first for stack, architecture, the verification ladder, footguns, and
> commit rules. This file is the Claude-Code overlay (session/instance protocol
> plus the `.claude/skills/` procedures) layered on top of it.

## Vittu clause

When "vittu" appears in the user's prompt: max speed, aggressive subagents for independent tasks in parallel, no confirmations between steps.

## Task tracking

`TODO.md` is the shared task list across all Claude Code sessions (a local working file, intentionally untracked — clones won't have it; create an empty one if missing). Read it at the start of every session. Update it when tasks are added, started, or completed. Keep it concise — no completed items, just in-progress and backlog. After finishing a task, note how long it took before removing it.

Every TODO item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large. In text: 🟢 **[S]**, 🟡 **[M]**, 🔴 **[L]**.

Every TODO item must have an LLM marker: ⚡ Sonnet-capable (mechanical, repetitive, well-defined) or 🧠 Opus recommended (architectural, complex reasoning, multi-file). Place after size emoji: `🟢⚡` or `🟡🧠`. After completing a task, assess and tag new items.

**⚠️ MANDATORY: 4 permanent Claude instances: Claude 1, Claude 2, Claude 3, Claude 4.** Names assigned by user — never pick your own. Ask if you don't know. Move tasks to "In Progress" with your name, e.g. `[Claude 1, main]` or `[Claude 3, worktree-name]`. Unmarked work causes collisions. **No exceptions. No silent work.**

**🚨 If you pause or stop mid-task, your "In Progress" entry MUST remain until the work is committed and pushed.** Other instances depend on this to avoid collisions.

**Solo autonomous agents:** the instance protocol exists only to deconflict multiple concurrent Claude instances. If you are a single agent with no human-assigned name and no other instances running (e.g. a fresh clone with no `TODO.md`), skip the ritual — work on a feature branch and let the PR be your coordination record.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

- Claude commits and pushes directly on **feature branches** — logical, self-contained conventional commits (one concern per commit), verified before every push (`npm run typecheck` + targeted tests; the pre-push hook runs the full suite). Never commit to `main` — everything lands via a PR.
- PRs are reviewed with `/review` (adversarially for substantial changes) and merged only on explicit instruction — **rebase-merge**, preserving the commit history.
- **Before providing any commit message, update ALL affected files first** (README.md, etc.). Never provide a commit message while dependent files are still out of date.
- Changes to `CLAUDE.md` or `README.md` must be committed **separately** from code — use a `docs()` commit.
- **⚠️ After every push, re-read `TODO.md` and present the full task list.**
- **⚠️ When editing any `.md` file, re-read it and present the content back to the user.**

## Project overview

Full-stack HR management system. **Portfolio / showcase project** — favour thorough, production-grade implementations.

`README.md` is the **show window for employers** — keep it accurate and polished. **Any code change affecting features, tests, architecture, or file structure MUST include a README.md update** (separate docs commit).

## Tech stack

Next.js 16 (App Router) · React 19 · MUI v7 (dark theme, no Tailwind) · TypeScript 5.9 · Prisma 7 · PostgreSQL + MongoDB 8 (audit logs) · Zod 4 · NextAuth v5 (JWT, Google/GitHub OAuth + demo login) · next-intl (18 locales) · Jest 30 + RTL · ESLint 9 · Prettier 3 · GitHub Actions CI · Vercel deployment

## Architecture rules

- **Feature-based modules** in `src/features/*/` — each domain has its own `schemas.ts`, `queries.ts`, `actions.ts`, `components/`, and `__tests__/`.
- **Reads** in `features/*/queries.ts`, **mutations** in `features/*/actions.ts` (`"use server"`), always inside `prisma.$transaction()`.
- **Barrel re-exports**: `queries.ts` (root) re-exports all feature queries, `serverActions/index.ts` re-exports all feature actions, `schemas/index.ts` re-exports all feature schemas. Existing `@/schemas`, `@/queries`, `@/serverActions` imports still work.
- **Shared constants** (MAX_NAME_LENGTH, EmailSchema, ImageUrlSchema) in `schemas/shared.ts` — feature schemas import from `@/schemas/shared`.
- **Shared components** (SnackbarProvider, ThemeRegistry, DataTable, ConfirmDialog, etc.) in `src/components/shared/`. TopBar and LeaveManager subdirs remain at `src/components/`.
- **Audit logging** is dual-path behind the `audit-use-outbox` feature flag (ON in production): entries are written to the `AuditOutbox` Postgres table **inside the mutation transaction**, then a single advisory-locked drainer (`src/lib/auditOutbox.ts`) delivers them to MongoDB and assigns the tamper-evident hash chain (drains via `after()` + the daily `/api/cron/audit-drain` backstop). Flag OFF = legacy direct `after()` writes to Mongo. No FK to User.
- **Mutations use one of two sanctioned patterns** — match the file you are editing, and never hand-roll permission/audit logic outside them: (1) the **wrappers** `guardedAction(permission, name, fn)` (auth + rate-limit + tracing) + `withAuditedTransaction(fn)` (Prisma tx + audit capture via `addAudit`) — the default for domain entities; (2) the **inline** pattern — `safe()` (`@/lib/actionUtils`) or a typed return with manual `requirePermission`/`auth()` + `rateLimit` + `captureAuditContext`/`deferAudit(Log)` inside an explicit `$transaction` — used by `data`, `featureFlags`, `jobs`, `profile`, `sessions` (self-service or infrastructure actions that need a typed `ActionResult` for `useActionState`). Prefer the wrappers for new domain features.
- **Errors**: throw `ActionError(code, message)`. `ErrorCode` (`src/actionErrors.ts`) is a **manual union** — adding a code requires (1) the union member, (2) an `errors.<code>` key in `messages/en.json`, (3) translations (`npm run i18n:translate` or by hand). CI enforces (2) via `npm run check:error-codes`.
- **Cache invalidation**: high-traffic queries use the `cache()` wrapper (`src/lib/cache.ts`) with tags (`ORG_DATA_TAG`, `DASHBOARD_TAG`); after a mutation call `revalidatePath()` and, when dashboard data changed, `invalidateDashboardCache()` (`src/lib/cacheInvalidation.ts`). Copy the pattern from a neighboring feature's actions.
- Pages are async Server Components passing props to Client Components. No `useEffect` data fetching.
- Forms use `useActionState` with `action=` prop. Create forms use `useOptimistic`.
- Types derived from Zod schemas in `features/*/schemas.ts` via `z.infer`. No duplicate interfaces.
- MUI styles centralized in `muiStyles.ts`.
- Never nest `$transaction` calls.
- Security logic (auth, validation, access control, DB queries) stays server-side.

## Testing

- **Always run tests** (`npm run test:all`) after code changes (logic, components, actions, queries). Never `npm test` alone.
- **Always type-check** (`npm run typecheck`) before pushing — jest is transpile-only and does NOT catch type errors; without this they surface only in `next build` (CI's last step). The codebase is kept at zero `tsc` errors, tests included.
- **Skip tests** after docs-only commits (README, CLAUDE.md, TODO.md) or formatting-only runs.
- **Targeted tests first** — if only one file changed, run its test file first; full suite before final push. The full suite is ~3-5 min (server tests share one test DB — never run two suites concurrently).
- **Feature tests** co-located in `src/features/*/__tests__/`. **Shared tests** (accessibility, permissions, schemas) in `src/tests/shared/`. **Server tests** in `src/tests/server/`. Comment above each test explaining what it does.
- Every new schema/component/module must have tests. Aim for 100% coverage.
- Do not mock core logic — test real functionality.

## Formatting

- Prettier is source of truth. Run `npm run format` after every change.
- ESLint uses `eslint-config-prettier` to avoid conflicts.

## Known footguns (manual syncs & environment quirks)

- **`src/auth.ts` runs on the edge runtime** (imported by `proxy.ts`) — use `console`, never the pino logger, inside it.
- **`jest.config.stryker.mjs` mirrors `jest.config.server.ts`** — any module mocked in one must be mirrored in the other (guarded by `src/tests/server/jestConfigSync.test.ts`).
- **Permissions source of truth** is `src/permissions.ts` (currently 38 keys) — update README/architecture counts when adding one.
- **Vercel**: `scripts/vercel-ignore.sh` skips builds for same-commit redeploys AND for pushes touching only docs/tests/CI config (push a code change to force a build); migrations run only on production deploys (`scripts/vercel-build.sh`).
- **Pre-push hook** runs the i18n audit (blocks >25 untranslated keys) and the full test suite — the unblock loop is in the `i18n` skill.

## Project skills (`.claude/skills/`)

Procedural knowledge lives in on-demand skills, not here: **verify** (the gate
ladder before any push, single-suite rule, flaky suites), **i18n** (18-locale
procedure, error-code coupling, the pre-push loop), **add-feature** (full
feature-module scaffold + wiring checklist), **release** (merge → deploy →
verify → flag cutover). Consult the matching skill before doing any of those
tasks.
