# AGENTS.md

The contract for any automated coding agent (or new human) working in this
repository. It is vendor-neutral on purpose: tools that auto-load `AGENTS.md`
(Cursor, Copilot, Codex, Gemini CLI, and others) get the same orientation that
Claude Code gets from `CLAUDE.md`. **Read this first.**

> **Relationship to `CLAUDE.md`:** `AGENTS.md` is the canonical, shared
> contract — stack, architecture, the verification ladder, footguns, commit
> rules. `CLAUDE.md` is the Claude-Code overlay on top of it (session/instance
> protocol, the `.claude/skills/` procedures). When the architecture changes,
> update both. Deep, task-specific procedures live in `.claude/skills/`
> (`verify`, `i18n`, `add-feature`, `release`) — consult the matching skill
> before doing one of those tasks.

## Start here (orientation for a fresh agent)

- **What this is:** a full-stack HR management system. It is a **portfolio /
  showcase project** — favour thorough, production-grade implementations, and
  keep `README.md` (the "show window for employers") accurate.
- **Where intent lives:** this file + `CLAUDE.md` (rules), `docs/architecture.md`
  (request/data/auth flows as Mermaid diagrams), `README.md` (feature tour),
  and `.claude/skills/` (procedures). Dated reports under `docs/audits/` and
  `docs/security/` are **historical snapshots** — see their superseded banners;
  do not treat their findings as open work (the criticals were remediated in
  PRs #14–#23).
- **Where to make a change:** features are self-contained modules under
  `src/features/<domain>/`. A typical change touches one feature dir plus a few
  documented wiring points — use the `add-feature` skill's checklist.
- **How to verify your work:** run the gate ladder below. The codebase is kept
  at **zero `tsc` errors** and green tests; CI runs the same gates plus the
  production build.
- **What will block your push:** the pre-push hook runs the i18n audit and the
  **full** test suite. CI re-runs format → lint → typecheck → error-code
  coverage → tests+coverage → `next build` on every PR.

## Tech stack

Next.js 16 (App Router) · React 19 · MUI v7 (dark theme, no Tailwind) ·
TypeScript 5.9 · Prisma 7 · PostgreSQL + MongoDB 8 (audit logs) · Zod 4 ·
NextAuth v5 (JWT; Google/GitHub OAuth + opt-in demo login; TOTP 2FA) ·
next-intl (18 locales) · Jest 30 + React Testing Library · Playwright (E2E) ·
Stryker (mutation) · ESLint 9 · Prettier 3 · GitHub Actions CI · Vercel.

## Setup & run

```bash
npm ci                       # install (postinstall runs prisma generate)
cp .env.example .env         # fill AUTH_SECRET (openssl rand -base64 32) etc.
npx prisma migrate dev       # apply migrations to your dev DB
npm run dev                  # http://localhost:3000
```

Two databases are required: **PostgreSQL** (primary, via `DATABASE_URL` /
`DIRECT_URL`) and **MongoDB** (audit logs, via `MONGODB_URL`). `.env.example`
documents every variable; demo login is OFF by default
(`NEXT_PUBLIC_DEMO_LOGIN=true` to enable).

### Running server tests locally

Server/integration tests run against a **real** PostgreSQL test database (no
mocks) and an **in-memory** MongoDB. They read `.env.test`, which is gitignored.

If you already have Postgres on `:5432`:

```bash
cp .env.test.example .env.test   # targets :5432/hrmanager_test (postgres/postgres)
npm run test:all                 # pushes schema to the test DB, runs every suite
```

**No Postgres running?** Bring one up headlessly with Docker — MongoDB is
in-memory for tests, so only the `db` service is needed:

```bash
docker compose up -d db                                    # postgres:17 on :5432
docker compose exec db createdb -U postgres hrmanager_test # one-time
cp .env.test.example .env.test
npm run test:all
```

If `.env.test` is missing (and no `DATABASE_URL` is set), `npm run test:all`
fails fast with a `cp .env.test.example .env.test` hint (`scripts/check-test-env.mjs`)
— that missing file, not your change, is usually the cause.

## Verification ladder (run before every push)

Fast → slow; stop at the first failure. This mirrors CI (`.github/workflows/ci.yml`)
and the `verify` skill.

1. `npm run format` — Prettier is the source of truth.
2. `npm run lint` — ESLint 9 (flat config, `eslint-config-prettier`).
3. `npm run typecheck` — **always** before pushing. Jest is transpile-only and
   does **not** catch type errors; without this they surface only in `next build`.
4. `npm run check:error-codes` — every `ErrorCode` union member must have an
   `errors.<code>` key in `messages/en.json` or `next build` fails.
5. **Targeted tests first** — if one file changed, run its test file. Then the
   full suite (`npm run test:all`) before the final push.

**Single-suite rule:** server tests share one PostgreSQL test DB. **Never run
two suites concurrently** — parallel runs corrupt the shared DB and produce
_phantom_ failures. Run one suite at a time.

## Architecture rules

- **Feature modules** in `src/features/<domain>/`: each has `schemas.ts`,
  `queries.ts`, `actions.ts`, `components/`, and `__tests__/`. **Reads** go in
  `queries.ts`; **mutations** in `actions.ts` (`"use server"`), always inside
  `prisma.$transaction()`. **Never nest `$transaction` calls.**
- **Barrels** are the public cross-feature surface: `queries.ts` (root)
  re-exports all feature queries, `serverActions/index.ts` all actions,
  `schemas/index.ts` all schemas. Prefer importing another feature's public
  surface via `@/queries`, `@/serverActions`, `@/schemas` rather than reaching
  into `@/features/<other>/...` internals. A CI ratchet fails the build if
  cross-feature deep imports (alias or relative) grow past the current baseline —
  route new ones through a barrel, or put shared UI in `src/components/shared/`.
  Run it with `npm run check:boundaries`.
- **Two sanctioned mutation patterns** (both fine — match the file you are in):
  1. `guardedAction(permission, name, fn)` + `withAuditedTransaction(fn)` — the
     default for domain entities (persons, teams, departments, reviews, leave,
     admin…). Wraps auth + rate-limit + tracing and the Prisma tx + audit capture.
  2. The **inline** pattern — `safe()` (`@/lib/actionUtils`) or a direct typed
     return, with manual `requirePermission`/`auth()` + `rateLimit()` +
     `captureAuditContext`/`deferAudit(Log)` inside an explicit `$transaction`.
     Used by `data`, `featureFlags`, `jobs`, `profile`, `sessions` — actions
     that are self-service (`auth()` not a permission), operate on
     infrastructure, or need a custom audit shape / a typed `ActionResult` for
     `useActionState`.

  Never hand-roll permission checks or audit writes _outside_ one of these two
  patterns.

- **Errors:** throw `ActionError(code, message)`. `ErrorCode` (`src/actionErrors.ts`)
  is a **manual union** — adding a code requires (1) the union member, (2) an
  `errors.<code>` key in `messages/en.json`, (3) translations
  (`npm run i18n:translate` or by hand). CI enforces (2). See the `i18n` skill.
- **RBAC:** 38 granular permission keys in `src/permissions.ts` (the source of
  truth) resolved into the JWT. Security logic (auth, validation, access
  control, DB queries) stays **server-side**.
- **Audit logging** is dual-path behind the `audit-use-outbox` flag (ON in
  prod): entries are written to the `AuditOutbox` Postgres table **inside the
  mutation transaction**, then an advisory-locked drainer (`src/lib/auditOutbox.ts`)
  delivers them to MongoDB with a tamper-evident HMAC hash chain.
- **Cache:** high-traffic queries use `cache()` (`src/lib/cache.ts`) with tags;
  after a mutation call `revalidatePath()` and `invalidateDashboardCache()` when
  dashboard data changed. Copy a neighbouring feature's pattern.
- Pages are async **Server Components** passing props to Client Components. **No
  `useEffect` data fetching.** Forms use `useActionState`; create-forms use
  `useOptimistic`. Types derive from Zod schemas via `z.infer` — no duplicate
  interfaces. MUI styles are centralized in `muiStyles.ts`.

## Footguns (manual syncs & environment quirks)

- `src/auth.ts` runs on the **edge runtime** (imported by `proxy.ts`) — use
  `console`, never the pino logger, inside it.
- `jest.config.stryker.mjs` **mirrors** `jest.config.server.ts`: any module
  mocked in one must be mirrored in the other (guarded by
  `src/tests/server/jestConfigSync.test.ts`).
- Permissions source of truth is `src/permissions.ts` (38 keys) — update the
  README/architecture counts when adding one.
- Migrations are **additive and deploy-safe**, and run **only on production
  deploys** (`scripts/vercel-build.sh`). Prisma has no down-migrations — roll
  forward with an inverse migration. See `docs/runbooks/rollback.md`.
- `scripts/vercel-ignore.sh` skips Vercel builds for same-commit redeploys and
  for pushes touching only docs/tests/CI config — push a real code change to
  force a build.
- The **pre-push hook** runs the i18n audit (blocks >25 untranslated keys) and
  the full test suite; the unblock loop is in the `i18n` skill.

## Commit & PR conventions

- [Conventional Commits](https://www.conventionalcommits.org/). One concern per
  commit, logical and self-contained.
- Commit and push on **feature branches** — never directly to `main`. Verify
  before every push (`npm run typecheck` + targeted tests; the pre-push hook
  runs the full suite). Everything lands via a **PR**, **rebase-merged** to
  preserve history.
- Changes to `CLAUDE.md`, `AGENTS.md`, or `README.md` are committed
  **separately** from code (a `docs()` commit). Update all affected docs before
  writing the commit message.
- **Do not** add `Co-Authored-By` trailers or AI/instance names to commit
  messages.

## Map of the repo

| Path                                                                                       | What                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/features/<domain>/`                                                                   | self-contained feature modules (18 of them)                              |
| `src/lib/`                                                                                 | shared infra helpers (`auditOutbox.ts`, `cache.ts`, `actionUtils.ts`, …) |
| `src/auth.ts`, `src/permissions.ts`, `src/auditLog.ts`, `src/rateLimit.ts`, `src/proxy.ts` | root-level cross-cutting infrastructure                                  |
| `prisma/schema.prisma`                                                                     | 22 models, soft deletes (`deletedAt`), partial unique indexes            |
| `messages/*.json`                                                                          | 18 locale files (`en.json` is the key source of truth)                   |
| `docs/architecture.md`                                                                     | request / data-model / RBAC / auth flow diagrams                         |
| `docs/runbooks/rollback.md`                                                                | how to undo each class of change in production                           |
| `docs/audits/`, `docs/security/`                                                           | dated audit snapshots (historical — see banners)                         |
| `.claude/skills/`                                                                          | `verify`, `i18n`, `add-feature`, `release` procedures                    |
| `SECURITY.md`                                                                              | trust boundaries, security posture, how to report                        |
