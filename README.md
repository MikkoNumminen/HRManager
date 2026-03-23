# HRManager

A production-grade HR management system with granular RBAC, dashboard analytics, audit logging, rate limiting, CSP + security headers, AI-powered i18n across 18 languages, mobile-first responsive design, and 1189 tests (1155 unit/integration + 34 E2E) at 99.4% line coverage.

[![CI](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml/badge.svg)](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod)
![Jest](https://img.shields.io/badge/Tested_with-Jest_30-C21325?style=flat-square&logo=jest)
![Prettier](https://img.shields.io/badge/Formatted_with-Prettier-F7B93E?style=flat-square&logo=prettier)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)

### **[Try the live demo](https://hr-manager-pearl.vercel.app)** — click "Try Demo" to sign in instantly with your own isolated data sandbox, no account required.

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Dashboard overview" width="100%">
</p>
<p align="center">
  <img src="docs/screenshots/permissions.png" alt="Permission editor" width="49%">
  <img src="docs/screenshots/audit-log.png" alt="Audit log" width="49%">
</p>

---

## Highlights

- **Dashboard analytics** — KPI cards, bar chart (members per team), pie chart (teams per department), line chart (organization growth), and recent activity feed powered by MUI X Charts; permission-gated via `dashboard:view`
- **Optimistic updates** — React 19 `useOptimistic` on all create actions; new items appear in the table instantly before the server responds, then seamlessly merge with real data on revalidation
- **Mobile-first responsive design** — card-based layouts for mobile (< 900px), collapsible filters, responsive form buttons (stack vertically on mobile), hamburger menu with navigation drawer, shared responsive style tokens via `muiStyles.ts`
- **1189 tests (1155 unit/integration + 34 E2E), 99.4% line coverage** — Zod schemas, RBAC logic, auth callbacks, Prisma queries, server actions, rate limiting, auth route handlers, CSP proxy, audit logging, style tokens, dashboard analytics, optimistic UI, demo session isolation, all 46 UI components tested against real PostgreSQL, plus Playwright E2E covering full user flows
- **User profile page** — edit display name, set custom profile picture via URL, view role badge, join date, and read-only permissions summary grouped by domain; accessible from TopBar menu on both desktop and mobile
- **Demo session isolation** — each "Try Demo" click creates a private data sandbox with pre-seeded org data (6 people, 3 teams, 2 departments); sessions auto-expire after 24 hours of inactivity; no cross-session data leakage
- **Granular RBAC** — 4 roles, 24 permission keys, per-user grant/deny overrides with three-state toggles (deny / role default / grant), and "kick out" user removal with confirmation dialog
- **Soft deletes** — `deletedAt` column on Person, Team, Department, and TeamMember with partial unique indexes; split into production scope (`WHERE sessionId IS NULL`) and demo scope (`WHERE sessionId IS NOT NULL`) for multi-tenant uniqueness; cascade soft-deletes for team memberships and FK nulling for manager/head references; preserves full audit history
- **Immutable audit trail** — every mutation logged with before/after JSON snapshots inside the same `$transaction` for atomicity; permission denials and rate limit hits also logged as security events
- **18 languages** — next-intl with cookie persistence, Accept-Language detection, and an AI-powered translation pipeline using parallel Claude Code agents
- **Gamified demo tour** — 8-step tutorial with DOM-aware navigation hints, spotlight overlays, confetti celebrations, and auto-detection of task completion
- **Snackbar notifications** — global success/error toasts via React context + MUI Snackbar; consistent feedback across all 17 form actions
- **Accessibility (WCAG)** — semantic landmarks, skip-to-content link, ARIA labels on dialogs and controls, `role="alert"` on all error messages, keyboard-navigable table rows, `scope="col"` on all table headers, info tooltips with `cursor: "help"` on non-obvious column headers
- **6 visual themes** — CSS custom properties with FOUC-preventing inline script; instant switching without re-render
- **Content-Security-Policy** — nonce-based CSP via Next.js 16 proxy with per-request nonce generation; Emotion/MUI style injection, FOUC prevention script, and OAuth avatar domains whitelisted; plus X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy on all routes
- **Rate limiting** — PostgreSQL-based sliding window on all server actions (30 req/min) and auth endpoints (10 req/min); user-based for authenticated users, IP-based for auth and anonymous; no external services required
- **Autonomous CI auto-fix** — when CI fails on `main`, a GitHub Actions agent downloads failure logs, analyzes errors with Claude Code (`anthropics/claude-code-action`), and creates a fix PR for human review; restricted tool access and loop prevention for safety
- **Docker-ready** — `docker compose up` for a fully working local environment with PostgreSQL, auto-migration, and demo login

---

## Tech stack

| Layer      | Technology                                                     |
| ---------- | -------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components)                     |
| UI         | React 19 + MUI v7 + MUI X Charts                               |
| Language   | TypeScript 5.9                                                 |
| ORM        | Prisma 7 (driver adapters, `prisma.config.ts`)                      |
| Database   | PostgreSQL (Vercel Postgres / Neon in production)              |
| Validation | Zod 4                                                          |
| Auth       | NextAuth v5 (JWT, Google + GitHub OAuth + demo login)          |
| Testing    | Jest 30 + React Testing Library + Playwright E2E               |
| CI/CD      | GitHub Actions (lint, test, build) + autonomous auto-fix agent |

---

## Architecture

> Full diagrams (data model, request flow, RBAC resolution, server action lifecycle, auth flow) in [`docs/architecture.md`](docs/architecture.md).

```mermaid
graph LR
    Browser -->|HTTP| Proxy["proxy.ts (CSP + nonce)"]
    Proxy -->|Next.js App Router| Next["Next.js"]
    Next -->|Server Component| SC["Page (async)"]
    SC -->|read| Q["queries.ts"]
    SC -->|props| CC["Client Component"]
    CC -->|action=| SA["serverActions.ts"]
    SA -->|$transaction| Prisma
    SA -->|logAudit| Audit["auditLog.ts"]
    Audit -->|same tx| Prisma
    Q --> Prisma
    Prisma --> PG[(PostgreSQL)]
```

- **Reads** in `queries.ts` — Zod-validated, no `"use server"`
- **Mutations** in `serverActions.ts` — always inside `$transaction`, always audit-logged; deletes are soft (set `deletedAt`) with cascade logic
- **Types** in `schemas.ts` — Zod schemas with `z.infer` exports, used everywhere
- **Auth** in `auth.ts` — JWT strategy with permission-enriched tokens; automatic superuser bootstrapping; `permissionsVersion`-based stale permission detection
- **RBAC** in `permissions.ts` — resolution: superuser (all) → user override → role default
- **Demo isolation** in `demoSession.ts` — each demo login creates a `DemoSession` with a UUID; all entity tables carry a nullable `sessionId` column; queries and mutations filter by `sessionId` (`null` = real user, UUID = demo sandbox); stale sessions cleaned up after 24h
- **Profile** in `/profile` — authenticated users can edit their display name, set a custom profile picture URL, and view their effective permissions; changes are audit-logged
- **Forms** — React 19 `useActionState` with `action=` prop, no `onSubmit`; `useOptimistic` for instant table updates on create; success/error feedback via global snackbar; responsive button layout (stacked on mobile, inline on desktop)
- **Responsive** — mobile-first via MUI breakpoints (`xs`/`sm`/`md`); dual-render pattern (table + card views) with CSS display toggles; shared tokens in `muiStyles.ts`
- **Themes** — CSS custom properties injected before hydration; 6 palettes switchable at runtime
- **i18n** — 18 locale files synced against `en.json` via custom audit tooling

---

## RBAC

| Role          | Access                                                       |
| ------------- | ------------------------------------------------------------ |
| Superuser     | All permissions (immutable)                                  |
| Administrator | All CRUD + dashboard + audit log (no admin UI or data reset) |
| User          | Read-only                                                    |
| Guest         | Read-only (unauthenticated)                                  |

Individual permissions can be overridden per-user — e.g. granting `person:create` to a user, or denying `team:delete` from an administrator.

---

## Testing

| Layer            | Tests    |
| ---------------- | -------- |
| Zod schemas      | 95       |
| Prisma queries   | 60       |
| Server actions   | 158      |
| Auth callbacks   | 32       |
| Audit logging    | 10       |
| Rate limiting    | 18       |
| Auth route       | 5        |
| CSP proxy        | 20       |
| RBAC logic       | 28       |
| Style tokens     | 37       |
| Demo session     | 12       |
| Theme config     | 12       |
| Tutorial config  | 26       |
| i18n             | 14       |
| UI components    | 628      |
| E2E (Playwright) | 34       |
| **Total**        | **1189** |

```
Statements : 98.99%    Branches : 95.02%
Functions  : 97.76%    Lines    : 99.39%
```

Server-side tests run against a real PostgreSQL test database. Client-side tests cover all 46 components including dashboard charts, optimistic create wrappers, permission toggles, audit log filtering, mobile card views, tutorial system, snackbar notifications, theme switching, language selection, and profile editor. Playwright E2E tests run against a production build covering authentication, CRUD for all entities, admin/audit access, guest access control, theme/language persistence, and snackbar lifecycle.

---

## Developer tooling

```bash
npm run test:e2e        # Playwright E2E tests (builds & starts production server)
npm run test:e2e:ui     # Playwright interactive UI mode
npm run validate        # pre-commit gate: Prettier + ESLint + i18n audit + full test suite
npm run i18n:audit      # report missing, extra, and untranslated keys across all locales
npm run i18n:fix        # auto-fill missing keys with English fallback, remove extras
npm run i18n:translate  # auto-translate via Claude Haiku API (requires ANTHROPIC_API_KEY)
```

**AI translation pipeline** — the i18n sync agent (`scripts/i18n-sync.ts`) audits 17 locale files against `en.json`. Two translation paths: parallel Claude Code subagents during development (6 agents, 17 locales, ~80s) or headless Claude Haiku API for CI.

---

## Autonomous agents

| Agent                | Trigger                           | What it does                                                                                |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| **CI auto-fix**      | CI fails on `main`                | Downloads failure logs, runs Claude Code to analyze and fix errors, creates a PR for review |
| **i18n translation** | Manual (`npm run i18n:translate`) | Audits 17 locale files against `en.json`, translates missing keys via Claude API            |

Both agents use the `anthropics/claude-code-action` or Claude API for intelligence, with restricted tool access for safety. The CI auto-fix agent (`autofix.yml`) prevents infinite loops by skipping branches it created. Fix PRs are never auto-merged — a human must review and approve.

---

## Getting started

### Docker (recommended)

```bash
docker compose up             # starts PostgreSQL + app at localhost:3000
```

That's it. The container runs migrations automatically and the demo login works out of the box — no OAuth setup required. To add Google/GitHub OAuth, create a `.env` file with your credentials (see below).

### Manual setup

```bash
npm install                   # install dependencies
cp .env.example .env          # configure environment variables
npx auth secret               # generate AUTH_SECRET
createdb hrmanager_dev        # create PostgreSQL databases
createdb hrmanager_test
npx prisma migrate dev        # apply schema migrations
npm run dev                   # start dev server at localhost:3000
```

| Variable             | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                         |
| `AUTH_SECRET`        | NextAuth secret                                      |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                               |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                           |
| `AUTH_GITHUB_ID`     | GitHub OAuth client ID                               |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret                           |
| `ANTHROPIC_API_KEY`  | Claude API key (for auto-fix agent + i18n translate) |

---

## Deployment

Deployed on **Vercel** with **Vercel Postgres** (Neon). Build: `prisma generate && prisma migrate deploy && next build`. The first OAuth user is bootstrapped as superuser. A demo login lets visitors explore without setting up OAuth.

---

Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
