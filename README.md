# HRManager

A full-stack HR management system for managing employees, teams, and departments — built with Next.js 16, React 19, MUI v7, Prisma, and TypeScript. This is a portfolio project intentionally built to production-grade complexity to demonstrate technical depth and breadth.

[![CI](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml/badge.svg)](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod)
![Jest](https://img.shields.io/badge/Tested_with-Jest_30-C21325?style=flat-square&logo=jest)
![Prettier](https://img.shields.io/badge/Formatted_with-Prettier-F7B93E?style=flat-square&logo=prettier)

### **[Try the live demo](https://hr-manager-pearl.vercel.app)** — click "Try Demo" to sign in instantly as an administrator, no account required.

---

## Features

- **People management** — add, update and remove employees with name, email and position
- **Team management** — create teams, assign managers, add and remove members
- **Department management** — create departments with optional head and description, assign/remove teams, department detail pages with permission-gated actions
- **Granular RBAC** — four roles (superuser, administrator, user, guest) with 21 permission keys and per-user overrides (grant/deny individual permissions on top of role defaults)
- **Audit log** — immutable trail of every mutation with who, what, when, and before/after JSON snapshots; filterable admin viewer with pagination, human-readable change descriptions, and user name resolution
- **Admin UI** — user management panel with role assignment, per-user permission editor with role default / override / effective columns, audit log viewer, and info tooltips
- **Authentication** — NextAuth v5 with Google and GitHub OAuth plus a one-click demo login; JWT strategy with permission-enriched tokens; automatic superuser bootstrapping on first login
- **Guest mode** — unauthenticated users see read-only chip views of persons, departments, and teams; manage routes redirect to home
- **Permission-aware UI** — server-side permission guards on all mutations; client-side conditional rendering hides UI elements the user can't access
- **Relational integrity** — database constraints enforced at ORM level with cascading rules
- **Dark UI** — MUI dark theme with consistent component styling throughout
- **Type-safe** — end-to-end TypeScript with Zod schema validation and centralized inferred types
- **Server-first** — async Server Components for data fetching, Server Actions for mutations inside `$transaction` blocks
- **CI/CD** — GitHub Actions pipeline runs formatting, linting, full test suite with coverage, and production build on every push and PR
- **Thoroughly tested** — 533 Jest tests across six layers with 94%+ line coverage: Zod schemas, RBAC logic, Prisma queries, server actions, audit logging, and all UI components

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

> This downloads all the packages the project needs to run. Think of it like going to the store and buying all the ingredients before you can cook. Node.js reads the `package.json` shopping list and grabs everything from the internet into a `node_modules` folder.

---

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

> The app needs some secret keys and settings to work — things like database location and login credentials. These are kept in a `.env` file that is never committed to git (so your secrets stay yours). The `.env.example` file is a blank template with all the right variable names already in it. You copy it, then fill in the real values.

Required variables:

| Variable             | Description                  |
| -------------------- | ---------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string |
| `AUTH_SECRET`        | NextAuth secret (random key) |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID       |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret   |
| `AUTH_GITHUB_ID`     | GitHub OAuth client ID       |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret   |

Generate an auth secret:

```bash
npx auth secret
```

> `AUTH_SECRET` is a random string that NextAuth uses to sign and encrypt login session tokens. It has to be secret and unpredictable — you never write this yourself. The command above generates a cryptographically secure value and prints it so you can paste it into your `.env`. For Google and GitHub credentials, you register an OAuth app in each provider's developer console and copy the client ID and secret they give you.

---

### 3. Set up the database

Install PostgreSQL locally, then create the dev and test databases:

```bash
createdb hrmanager_dev
createdb hrmanager_test
```

Apply the schema migrations:

```bash
npx prisma migrate dev
```

> This connects to the PostgreSQL database specified in `DATABASE_URL` and applies all migrations from `prisma/migrations/`. It also generates the Prisma client — the type-safe query builder the app uses to talk to the database. You only need to run this once on a fresh clone, or again whenever the schema changes.

---

### 4. Start the dev server

```bash
npm run dev
```

> This starts the Next.js development server with hot reload. Any file you save will automatically update in the browser without a full restart. The app will be available at the address below.

Open [http://localhost:3000](http://localhost:3000).

---

### Run tests

```bash
npm test            # UI + schema tests (jsdom)
npm run test:server # query + server action tests (Node, real PostgreSQL)
npm run test:all    # both suites
```

> The project has **536 tests** split into two suites. `npm test` runs the client-side tests — component rendering, user interactions, form validation, Zod schema parsing, and RBAC permission resolution — all in a jsdom environment. `npm run test:server` runs the server-side tests against a real PostgreSQL test database — every Prisma query, every server action mutation (including admin role/permission management and department operations), audit log creation, audit log queries, UUID validation, duplicate prevention, and cascade deletes. The test database (`hrmanager_test`) is separate from the dev database and never touches your dev data. Configure its connection string in `.env.test`.

---

### Format code

```bash
npm run format
```

> Runs Prettier across all source files and rewrites them to match the project's code style. This is the source of truth for formatting — consistent indentation, quote style, trailing commas, and line width. Run `npm run format:check` if you want to verify formatting without changing any files.

---

## Tech stack

| Layer             | Technology                                            |
| ----------------- | ----------------------------------------------------- |
| Framework         | Next.js 16 (App Router, Server Components)            |
| UI library        | React 19 (`useActionState`, `<form action>`)          |
| Component library | MUI v7 (Material UI)                                  |
| Language          | TypeScript 5.9                                        |
| ORM               | Prisma 6 (`relationLoadStrategy: 'join'`)             |
| Database          | PostgreSQL (Vercel Postgres in production)            |
| Validation        | Zod 4                                                 |
| Auth              | NextAuth v5 (JWT, Google + GitHub OAuth + demo login) |
| Testing           | Jest 30 + React Testing Library                       |
| Linting           | ESLint 9 (flat config)                                |
| Formatting        | Prettier 3                                            |
| CI/CD             | GitHub Actions (lint, test, build)                    |

---

## Architecture

The app uses Next.js App Router with a clear separation of concerns:

- **Server Components** fetch data at the page level and pass it as props to client components — no `useEffect` data fetching
- **Server Actions** (`serverActions.ts`) handle all mutations inside `$transaction` blocks for atomicity
- **Read queries** (`queries.ts`) are separated from mutations and validated through Zod schemas
- **Centralized types** (`schemas.ts`) — Zod schemas export inferred `Person`, `CombinedTeam`, `Department`, `AppUser`, `AuditLog`, and `Permissions` types used across all components
- **Forms** use React 19's `useActionState` for error handling with built-in pending state
- **Auth** (`auth.ts`) — NextAuth v5 with JWT strategy; Google + GitHub OAuth plus a Credentials-based demo login for portfolio visitors; protected routes redirect unauthenticated users; guest mode shows read-only chip views
- **RBAC** (`permissions.ts`) — granular permission system with role defaults, per-user overrides, and server-side guards on every mutation
- **Audit logging** (`auditLog.ts`) — every mutation is logged with before/after snapshots inside the same transaction for atomicity

```
src/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── admin/                   # User management (superuser-protected)
│   │   └── audit/               # Audit log viewer (permission-protected)
│   ├── manageDepartments/        # Department management (permission-protected)
│   ├── managePersons/           # Person management (permission-protected)
│   └── manageTeams/             # Team management (permission-protected)
├── components/       # Reusable MUI client components
├── tests/            # Jest tests (client + server)
├── types/            # TypeScript module augmentations (next-auth.d.ts)
├── auditLog.ts       # Audit logging helper (logAudit)
├── auth.ts           # NextAuth v5 configuration + RBAC callbacks
├── db.ts             # Prisma singleton
├── muiStyles.ts      # Centralised style tokens and component styles
├── permissions.ts    # RBAC: role defaults, permission resolution, guards
├── queries.ts        # Read-only data fetching (Prisma + Zod validation)
├── schemas.ts        # Zod schemas and exported TypeScript types
└── serverActions.ts  # Mutation server actions (Prisma $transaction)
prisma/
└── schema.prisma     # Data model (Person, Team, Department, User, Permission, UserPermission, AuditLog)
```

---

## Data model

```
Person          Team             Department        User              Permission
├── id          ├── teamId       ├── id            ├── id             ├── id
├── name        ├── teamName     ├── name          ├── email          ├── key
├── email       ├── managerId    ├── description?  ├── name           └── description
├── position    ├── departmentId ├── headId?       ├── role
└── manager?    └── members[]    └── teams[]       └── permissions[]   UserPermission
                                                                       ├── userId
AuditLog                                                               ├── permissionId
├── id                                                                 └── granted
├── userId
├── userEmail
├── action
├── entityType
├── entityId
├── before (JSON)
├── after (JSON)
└── createdAt
```

- **Person** — employees with name, email, position, and optional manager (self-referencing FK)
- **Team** — teams with a name, optional manager (FK to Person), optional department (FK to Department with SetNull), and members via join table
- **Department** — organizational unit with name, optional description, optional head (FK to Person with SetNull), and associated teams
- **User** — authenticated identity from OAuth, with role (superuser/administrator/user/guest)
- **Permission** — catalog of 21 granular permission keys (e.g. `person:create`, `team:delete`, `department:assign_team`, `admin:manage_users`)
- **UserPermission** — per-user permission overrides (grant/deny) with role-default fallback
- **AuditLog** — immutable log entries with denormalized user info (no FK), action type, entity reference, and JSON before/after snapshots

---

## RBAC permission system

The app implements a granular Role-Based Access Control system with four roles and 21 permission keys:

| Role          | Default permissions                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Superuser     | All permissions (immutable — cannot be modified or assigned via UI)                               |
| Administrator | All person, team, and department operations + audit log access (no data reset, seed, or admin UI) |
| User          | Read-only (person:read, team:read, department:read)                                               |
| Guest         | Read-only (same as user, but unauthenticated)                                                     |

**Permission resolution precedence**: superuser (always all) → explicit UserPermission override → role default.

Individual permissions can be overridden per-user through the admin UI — for example, granting `person:create` to a regular user, or denying `team:delete` from an administrator. The first user to log in via OAuth is automatically bootstrapped as the superuser.

---

## Testing

536 tests across 34 test suites, covering every layer of the application:

| Layer              | Tests | What's covered                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod schemas**    | 71    | PersonSchema, TeamSchema, TeamMemberSchema, DepartmentSchema, DepartmentTeamSchema, UserSchema, PermissionsSchema, AuditLogSchema, AuditLogFilterSchema, AuditActionSchema, AuditEntityTypeSchema — valid data, missing fields, invalid UUIDs, nullable fields, wrong types, enum validation                                       |
| **Prisma queries** | 37    | `getPersons`, `getTeams`, `getDepartments`, `getUsers`, `getUserById`, `getAllPermissionKeys`, `getAuditLogs`, `getAuditLogUserEmails` against real PostgreSQL — filtering, pagination, ordering, empty state, distinct emails, department relations                                                                               |
| **Server actions** | 96    | All 20 mutations — CRUD for persons/teams/members/departments, department head assignment, team-department assignment, admin role updates, permission override grant/deny/reset, mock data seeding, UUID validation, duplicate prevention, cascade deletes, superuser protection, idempotent seed with upserts                     |
| **Audit logging**  | 6     | `logAudit` — user info capture, null user (unauthenticated), JSON serialization of before/after, undefined handling, null entityId, transaction client usage                                                                                                                                                                       |
| **RBAC logic**     | 27    | `resolvePermissions`, `getCurrentUser`, `getUserPermissions`, `hasPermission`, `requirePermission`, `seedPermissions` — superuser immunity, role defaults, grant/deny overrides, session lookup, unauthenticated fallback, permission seeding                                                                                      |
| **UI components**  | 298   | All 30 components — rendering, user interactions, keyboard accessibility, form validation, permission-based visibility, role chips, selection cards, minimal/chip/full views, empty states, router navigation, admin menu links, audit log filtering, reset/seed dialogs, department management, demo login button, error handling |

```
Coverage summary (combined client + server suites)
  Statements : 93.93%
  Branches   : 86.93%
  Functions  : 95.27%
  Lines      : 94.86%
```

Highlights: `auditLog.ts`, `permissions.ts`, `queries.ts`, `schemas.ts`, and `serverActions.ts` at 97–100% line coverage. Server-side tests run against an isolated PostgreSQL test database (`hrmanager_test`) — the dev database is never touched.

---

## Deployment

The app is deployed on **Vercel** with **Vercel Postgres** (Neon). The build script runs `prisma generate && prisma migrate deploy && next build` — migrations are applied automatically on every deployment.

The first user to sign in via OAuth is bootstrapped as the superuser. A **demo login** (NextAuth Credentials provider) is available so portfolio visitors can explore the full UI without setting up OAuth — the demo user is created as an administrator with access to all person, team, and department operations.

---

### Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
