# HRManager

A production-grade HR management system with granular RBAC, audit logging, AI-powered i18n across 18 languages, and 806 tests at 99.7% line coverage.

[![CI](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml/badge.svg)](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod)
![Jest](https://img.shields.io/badge/Tested_with-Jest_30-C21325?style=flat-square&logo=jest)
![Prettier](https://img.shields.io/badge/Formatted_with-Prettier-F7B93E?style=flat-square&logo=prettier)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)

### **[Try the live demo](https://hr-manager-pearl.vercel.app)** — click "Try Demo" to sign in instantly, no account required.

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Dashboard overview" width="100%">
</p>
<p align="center">
  <img src="docs/screenshots/permissions.png" alt="Permission editor" width="49%">
  <img src="docs/screenshots/audit-log.png" alt="Audit log" width="49%">
</p>

---

## Highlights

- **806 tests, 99.7% line coverage** — Zod schemas, RBAC logic, auth callbacks, Prisma queries, server actions, audit logging, and all 42 UI components tested against real PostgreSQL
- **Granular RBAC** — 4 roles, 23 permission keys, per-user grant/deny overrides with three-state toggles (deny / role default / grant)
- **Immutable audit trail** — every mutation logged with before/after JSON snapshots inside the same `$transaction` for atomicity
- **18 languages** — next-intl with cookie persistence, Accept-Language detection, and an AI-powered translation pipeline using parallel Claude Code agents
- **Gamified demo tour** — 8-step tutorial with DOM-aware navigation hints, spotlight overlays, confetti celebrations, and auto-detection of task completion
- **Snackbar notifications** — global success/error toasts via React context + MUI Snackbar; consistent feedback across all 15 form actions
- **Accessibility (WCAG)** — semantic landmarks, skip-to-content link, ARIA labels on dialogs and controls, `role="alert"` on all error messages, keyboard-navigable table rows, `scope="col"` on all table headers
- **6 visual themes** — CSS custom properties with FOUC-preventing inline script; instant switching without re-render
- **Docker-ready** — `docker compose up` for a fully working local environment with PostgreSQL, auto-migration, and demo login

---

## Tech stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components)            |
| UI         | React 19 + MUI v7                                     |
| Language   | TypeScript 5.9                                        |
| ORM        | Prisma 6 (`relationLoadStrategy: 'join'`)             |
| Database   | PostgreSQL (Vercel Postgres / Neon in production)     |
| Validation | Zod 4                                                 |
| Auth       | NextAuth v5 (JWT, Google + GitHub OAuth + demo login) |
| Testing    | Jest 30 + React Testing Library                       |
| CI/CD      | GitHub Actions (lint, test, build on every push)      |

---

## Architecture

```
Server Components (data fetching) → Client Components (rendering, UI state)
Server Actions ($transaction)     → Prisma → PostgreSQL
                                  → logAudit() (same transaction)
```

- **Reads** in `queries.ts` — Zod-validated, no `"use server"`
- **Mutations** in `serverActions.ts` — always inside `$transaction`, always audit-logged
- **Types** in `schemas.ts` — Zod schemas with `z.infer` exports, used everywhere
- **Auth** in `auth.ts` — JWT strategy with permission-enriched tokens; automatic superuser bootstrapping
- **RBAC** in `permissions.ts` — resolution: superuser (all) → user override → role default
- **Forms** — React 19 `useActionState` with `action=` prop, no `onSubmit`; success/error feedback via global snackbar
- **Themes** — CSS custom properties injected before hydration; 6 palettes switchable at runtime
- **i18n** — 18 locale files synced against `en.json` via custom audit tooling

---

## RBAC

| Role          | Access                                           |
| ------------- | ------------------------------------------------ |
| Superuser     | All permissions (immutable)                      |
| Administrator | All CRUD + audit log (no admin UI or data reset) |
| User          | Read-only                                        |
| Guest         | Read-only (unauthenticated)                      |

Individual permissions can be overridden per-user — e.g. granting `person:create` to a user, or denying `team:delete` from an administrator.

---

## Testing

| Layer          | Tests   |
| -------------- | ------- |
| Zod schemas    | 71      |
| Prisma queries | 38      |
| Server actions | 106     |
| Auth callbacks | 20      |
| Audit logging  | 6       |
| RBAC logic     | 28      |
| UI components  | 534     |
| **Total**      | **806** |

```
Statements : 99.08%    Branches : 95.57%
Functions  : 99.70%    Lines    : 99.76%
```

Server-side tests run against a real PostgreSQL test database. Client-side tests cover all 42 components including permission toggles, audit log filtering, tutorial system, snackbar notifications, theme switching, and language selection.

---

## Developer tooling

```bash
npm run validate        # pre-commit gate: Prettier + ESLint + i18n audit + full test suite
npm run i18n:audit      # report missing, extra, and untranslated keys across all locales
npm run i18n:fix        # auto-fill missing keys with English fallback, remove extras
npm run i18n:translate  # auto-translate via Claude Haiku API (requires ANTHROPIC_API_KEY)
```

**AI translation pipeline** — the i18n sync agent (`scripts/i18n-sync.ts`) audits 17 locale files against `en.json`. Two translation paths: parallel Claude Code subagents during development (6 agents, 17 locales, ~80s) or headless Claude Haiku API for CI.

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

| Variable             | Description                  |
| -------------------- | ---------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string |
| `AUTH_SECRET`        | NextAuth secret              |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID       |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret   |
| `AUTH_GITHUB_ID`     | GitHub OAuth client ID       |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret   |

---

## Deployment

Deployed on **Vercel** with **Vercel Postgres** (Neon). Build: `prisma generate && prisma migrate deploy && next build`. The first OAuth user is bootstrapped as superuser. A demo login lets visitors explore without setting up OAuth.

---

Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
