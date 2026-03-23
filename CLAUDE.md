# HRManager – Claude Code Rules

## Project overview

A full-stack HR management system for managing employees, teams, and departments.
Built with Next.js 16 (App Router), React 19, MUI v7, Prisma 7, Zod 4, TypeScript 5.9, Jest 30.

This is a **portfolio / showcase project**. The goal is to demonstrate technical depth and breadth, not to ship the leanest possible product. Features are intentionally built to production-grade complexity (e.g. granular per-user RBAC instead of simple role checks) to showcase what the developer can build. When in doubt, favour the more thorough implementation.

`README.md` is the **show window for potential employers** — it must always reflect the current state of the project accurately, with up-to-date test counts, feature lists, architecture descriptions, and file structure. Keep it polished and impressive. **Any code change that affects features, architecture, data model, file structure, test counts, or coverage MUST include a corresponding README.md update** (as a separate docs commit). Never leave README.md out of date.

## Tech stack

| Layer      | Technology                                                                |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components)                                |
| UI         | React 19 + MUI v7 — dark theme throughout, no Tailwind                    |
| Language   | TypeScript 5.9                                                            |
| ORM        | Prisma 7 (driver adapters, Typed SQL, `prisma.config.ts`)                 |
| Database   | PostgreSQL (local dev + Vercel Postgres / Neon in production)             |
| Validation | Zod 4                                                                     |
| Auth       | NextAuth v5 (JWT strategy, Google + GitHub OAuth + demo login)            |
| i18n       | next-intl, 18 locales, AI-powered translation pipeline                    |
| Testing    | Jest 30 + React Testing Library                                           |
| CI/CD      | GitHub Actions (lint, format, test, build on every push) + auto-fix agent |
| Linting    | ESLint 9 (flat config)                                                    |
| Formatting | Prettier 3 (`printWidth: 100`, double quotes, trailing commas)            |
| Deployment | Vercel with Vercel Postgres (Neon serverless PostgreSQL)                  |

## Architecture

- **Reads** go in `queries.ts` (no `"use server"`). Validated through Zod schemas. Dashboard metrics use Prisma Typed SQL (`prisma/sql/`) with `$queryRawTyped` for type-safe raw queries.
- **Mutations** go in `serverActions.ts` (marked `"use server"`). Always inside `prisma.$transaction()` — even single operations. Every mutation is audit-logged via `logAudit()` from `auditLog.ts` inside the same transaction for atomicity.
- **Audit logging** — `auditLog.ts` provides `logAudit()` which records who, what action, which entity, and before/after JSON snapshots. Uses `auth()` session for actor identity. Accepts optional `tx` param to run inside an existing transaction. No FK to User — logs survive user deletion. `logPermissionDenial()` and `logRateLimitHit()` log security events (permission denials and rate limit hits) to the same audit trail.
- Pages are async Server Components that fetch data and pass it as props to Client Components. No `useEffect` data fetching.
- Forms use React 19's `useActionState` with `action=` prop, not `onSubmit`. Create forms use `useOptimistic` via wrapper components (`OptimisticPersons`, `OptimisticTeams`, `OptimisticDepartments`) to show new items in the table instantly before the server responds.
- Types are derived from Zod schemas in `schemas.ts` via `z.infer` — `Person`, `CombinedTeam`, `Department`, `AppUser`, `AuditLog`, `Permissions`. Do not create duplicate interfaces in components.
- MUI style tokens and component styles are centralized in `muiStyles.ts`.
- **Info tooltips**: Use MUI `Tooltip` with `arrow` and `cursor: "help"` on column headers or labels that may not be self-explanatory. Keep tooltip text concise but informative. Apply this consistently across all data tables and editor views.
- **Auth** is configured in `auth.ts` (NextAuth v5). Three providers: Google OAuth, GitHub OAuth, and a Credentials-based demo login (`id: "demo"`) that creates/reuses a `demo@hrmanager.app` user with superuser role. Protected routes use `auth()` + `redirect("/")` in Server Components. Client components use `useSession` via `SessionProvider` wrapper in layout.
- **Demo session isolation** — each demo login creates a `DemoSession` row and stores its UUID in the JWT as `demoSessionId`. All entity tables (Person, Team, Department, TeamMember, AuditLog) carry a nullable `sessionId` column. Queries and mutations filter by `sessionId`: `null` = real OAuth user data, UUID = demo sandbox. `seedDemoData()` populates the sandbox on login. `cleanupStaleDemoSessions()` removes sessions inactive > 24h, called opportunistically during login. Helper: `getDemoSessionId()` in `demoSession.ts`.
- **Guest mode**: unauthenticated users see read-only minimal views (MUI Chips) of Persons, Departments, and Teams on the main page. Manage routes (`/managePersons`, `/manageDepartments`, `/manageTeams`) redirect to `/`.
- **TopBar** — dual layout: desktop shows user avatar dropdown menu; mobile shows hamburger button with a full-height navigation drawer. Menu contains: Dashboard (permission-gated), User Management, Audit Log (permission-gated), Load Mock Data, Reset All Data (permission-gated), and Sign Out. The `permissions` prop must be passed on every page so all menu items are available everywhere.
- **Mobile-first responsive** — MUI breakpoints (`xs`/`sm`/`md`). Tables use dual-render pattern: both desktop table and mobile card views are in the DOM, CSS `display` toggles visibility at `md` breakpoint. Form buttons stack vertically on mobile via `formButtonContainerStyles`. Page containers use `pageContainerStyles` for responsive padding. AuditLogViewer has collapsible filters on mobile. All responsive tokens are centralized in `muiStyles.ts`.
- **Client-heavy rendering**: Keep the server thin — it handles only data fetching, auth, and validation. All rendering logic, UI state, filtering, sorting, and heavy computation belong in Client Components so the server stays lightweight and responsive. Security-sensitive logic (auth checks, input sanitization, access control, database queries) must always remain server-side — never trust the client for authorization or data integrity.
- **Content-Security-Policy** — `proxy.ts` (Next.js 16 proxy, formerly middleware) generates a per-request nonce and sets a strict CSP header. The nonce is passed to `layout.tsx` via `x-nonce` request header and forwarded to `AppRouterCacheProvider` (Emotion cache) and the FOUC prevention `<script>`. `style-src 'unsafe-inline'` is required for Emotion/MUI runtime style injection. Also sets X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, and Permissions-Policy on all routes.
- **Rate limiting** — `rateLimit.ts` provides a PostgreSQL-based sliding window rate limiter. Server actions use `rateLimit()` (30 req/min, user-based for authenticated, IP fallback). Auth endpoints use `rateLimitAuth()` (10 req/min, IP-only — can't call `auth()` during sign-in). The NextAuth POST handler in `route.ts` wraps with `rateLimitAuth()`, returning 429 JSON on limit; GET requests (session/CSRF) are unthrottled. Uses a `RateLimit` table with upsert — no external services. `cleanupExpiredRateLimits()` removes stale records.
- **Input validation** — all string inputs (names, emails, positions, descriptions) are validated with Zod `max()` constraints in `schemas.ts` and enforced in server actions before database writes.
- **Entity existence checks** — server actions verify that referenced entities (persons, teams, departments) exist inside the transaction before FK assignments to prevent dangling references.
- **JWT permission freshness** — `auth.ts` uses a `permissionsVersion` column on User to detect stale JWT permissions efficiently. Only performs a full permission re-fetch when the version changes, avoiding unnecessary DB load.
- **Transaction nesting** — never nest `$transaction` calls. In `seedMockData`, separate transactions run sequentially (main data → cleanup → `seedPermissions()` → user creation) to avoid deadlock.

## Autonomous agents

Two autonomous agents run in CI/CD:

- **CI auto-fix agent** (`.github/workflows/autofix.yml`) — triggers on CI failure on `main` via `workflow_run`. Uses `anthropics/claude-code-action` to download failure logs, analyze errors, and create a fix PR. Restricted tool access (`Edit`, `Write`, `Read`, `Glob`, `Grep`, `Bash(git:*)`, `Bash(npm:*)`, `Bash(npx:*)`). Prevents infinite loops by skipping `autofix/` branches. Requires `ANTHROPIC_API_KEY` GitHub secret.
- **i18n translation agent** (`scripts/i18n-sync.ts`) — audits 17 locale files against `en.json`, translates missing keys via Claude API. Run manually via `npm run i18n:translate` or via parallel Claude Code subagents during development.

## File structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── admin/                   # User management (superuser-protected)
│   │   └── audit/               # Audit log viewer (permission-protected)
│   ├── dashboard/               # Dashboard analytics (permission-protected)
│   ├── manageDepartments/       # Department management (permission-protected)
│   ├── managePersons/           # Person management (permission-protected)
│   ├── manageTeams/             # Team management (permission-protected)
│   └── profile/                 # User profile (auth-protected)
├── components/       # Reusable MUI client components (46 components)
├── i18n/             # next-intl configuration (actions, config, request)
├── tests/            # Jest tests (1139 tests)
├── types/            # TypeScript module augmentations (next-auth.d.ts)
├── auditLog.ts       # Audit logging helper (logAudit)
├── auth.ts           # NextAuth v5 configuration + RBAC callbacks
├── db.ts             # Prisma singleton
├── demoSession.ts    # Demo session isolation (seed, cleanup, session ID helper)
├── muiStyles.ts      # Centralised MUI style tokens
├── permissions.ts    # RBAC: role defaults, permission resolution, guards
├── proxy.ts          # CSP + security headers (nonce-based, per-request)
├── queries.ts        # Read-only data fetching
├── rateLimit.ts      # PostgreSQL-based rate limiting (sliding window)
├── schemas.ts        # Zod schemas and inferred types
├── serverActions.ts  # Mutation server actions
├── themeConfig.ts    # 6 visual themes (CSS custom properties)
└── tutorialConfig.ts # Gamified demo tour (8-step tutorial)
messages/             # 18 locale JSON files (en, fi, de, fr, es, ...)
prisma/
├── schema.prisma     # Data model (PostgreSQL)
└── sql/              # Prisma Typed SQL queries (dashboard metrics)
scripts/
└── i18n-sync.ts      # i18n audit and translation pipeline
docs/
└── architecture.md   # Mermaid diagrams (data model, request flow, RBAC, auth)
.github/
└── workflows/
    ├── ci.yml            # CI pipeline (lint, format, test, build)
    └── autofix.yml       # Auto-fix agent (triggers on CI failure)
Dockerfile            # Multi-stage build (deps → build → production)
docker-compose.yml    # PostgreSQL 17 + app with health checks
.dockerignore         # Excludes node_modules, .next, .git, etc.
```

## Data model

- **Person** — name, email, position. Can belong to multiple teams, manage teams, and head departments. Soft-deleted via `deletedAt`; cascade soft-deletes TeamMember rows and nulls team manager / department head FK refs.
- **Team** — name, manager (FK to Person), optional department (FK to Department, SetNull), members via TeamMember join table. Soft-deleted via `deletedAt`; cascade soft-deletes TeamMember rows.
- **Department** — name, optional description, optional head (FK to Person, SetNull). Teams assigned via Team.departmentId. Soft-deleted via `deletedAt`; nulls team departmentId refs.
- **TeamMember** — join table between Person and Team. Soft-deleted via `deletedAt`; re-adding a soft-deleted member restores the record.
- All four entity models use **partial unique indexes** (`WHERE deletedAt IS NULL`) so soft-deleted records retain original values without blocking new active records.
- **User** — authenticated identity (email, name, image, role). Linked to NextAuth OAuth.
- **Permission** — catalog of 24 granular permission keys (e.g. `person:create`, `team:delete`, `dashboard:view`).
- **UserPermission** — per-user permission overrides (grant/deny) with role-default fallback.
- **AuditLog** — immutable log of all mutations: who, what action, which entity, before/after JSON snapshots. No FK to User so logs survive user deletion. Carries `sessionId` for demo isolation.
- **RateLimit** — sliding window rate limit counters per identifier (IP) and action. Auto-cleaned on window expiry.
- **DemoSession** — tracks active demo sessions. `userId` FK to User, `lastActiveAt` for staleness detection. Data entities (Person, Team, Department, TeamMember) carry a nullable `sessionId` that references DemoSession.id for sandbox isolation.

## Task tracking

`TODO.md` is the shared task list across all Claude Code sessions. Read it at the start of every session to understand current priorities. Update it when tasks are added, started, or completed. Keep it concise — no completed items, just in-progress and backlog. After finishing a task, note how long it took (from start of work to commit+push) before removing it from the list.

Every TODO item must have a color-coded size estimate prefix: 🟢 small, 🟡 medium, 🔴 large. When listing estimates in text, use: 🟢 **[S]**, 🟡 **[M]**, 🔴 **[L]**.

**⚠️ MANDATORY: Every Claude instance MUST mark what it is working on in TODO.md BEFORE starting any work.** Move the task to "In Progress" with your `[worktree-name]` or `[main]` tag. If your task is not already in the list, add it first. The user monitors TODO.md to know what every Claude is doing — unmarked work is invisible and causes confusion and collisions. **No exceptions. No silent work.**

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

- Do **not** run `git commit` — only provide the commit message as text so the user can commit manually.
- On large multi-file features, **pause at natural commit boundaries** and provide a commit message before continuing. Don't wait until everything is done — commit early and often at logical checkpoints (e.g. schema + migration, then core logic, then UI, then tests).
- **STOP after every commit boundary.** Provide the commit message, list the files included, and **wait for the user to confirm** before writing any more code. The user needs to commit and push each change separately and in order. **Never continue to the next commit's work without explicit confirmation.** This is non-negotiable.
- **Before providing any commit message, update ALL affected files first.** If the code change affects test counts, coverage, features, architecture, or file structure, update `README.md` (and any other stale files) **before** presenting the commit message. Never provide a commit message while dependent files are still out of date.
- Changes to `CLAUDE.md` or `README.md` must be committed **separately** from code changes — always provide a dedicated `docs()` commit message for them.
- **⚠️ After every push, ALWAYS re-read `TODO.md` and present the full current task list (In Progress + Backlog) to the user.** The user relies on this as their primary progress tracker. Never skip this step.
- **⚠️ When you edit any `.md` file (TODO.md, README.md, CLAUDE.md, etc.), you MUST re-read it and present the updated content back to the user.** The user cannot see your edits directly — they need you to repeat the content so they can verify it. This is non-negotiable.

## Formatting

- Prettier is the source of truth for code style.
- Run `npm run format` after every completed change to format all files.
- `npm run format:check` verifies formatting without modifying files.
- ESLint uses `eslint-config-prettier` to disable rules that conflict with Prettier.

## Testing

- Run `npm run test:all` after every change — this runs both client and server test suites. Never use `npm test` alone.
- Update affected tests when modifying component APIs.
- Tests live in `src/tests/`.
- Do not mock core logic — test real functionality.
- Always add a comment above each test explaining what it does in plain, simple language ("Barney style").
- **Every new schema, component, or module must have corresponding tests.** Never leave new code untested — if you add it, you test it.
- **Always aim for 100% coverage.** The project currently has 99.5% line and 99.45% function coverage — push toward 100%. Add tests for every branch, edge case, error fallback, and interaction. If a new line or function is added, it must be covered. This is a portfolio project; comprehensive test coverage is a strength, not over-engineering.

## Docker

`docker compose up` starts PostgreSQL 17 + the app at `localhost:3000`. The container runs `prisma migrate deploy` on startup. `next.config.mjs` uses `output: "standalone"` for optimized Docker images. The Dockerfile is a multi-stage build: deps → build → production (node:22-alpine). OAuth credentials are optional — the demo login works without them.

## Deployment

Deployed on **Vercel** with **Vercel Postgres** (Neon). Build script: `prisma generate && prisma migrate deploy && next build`.
