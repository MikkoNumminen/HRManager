# HRManager

A full-stack HR management system for managing employees and teams — built with Next.js 16, React 19, MUI v7, Prisma, and TypeScript. This is a portfolio project intentionally built to production-grade complexity to demonstrate technical depth and breadth.

[![CI](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml/badge.svg)](https://github.com/MikkoNumminen/HRManager/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod)
![Jest](https://img.shields.io/badge/Tested_with-Jest_30-C21325?style=flat-square&logo=jest)
![Prettier](https://img.shields.io/badge/Formatted_with-Prettier-F7B93E?style=flat-square&logo=prettier)

---

## Features

- **People management** — add, update and remove employees with name, email and position
- **Team management** — create teams, assign managers, add and remove members
- **Granular RBAC** — four roles (superuser, administrator, user, guest) with 16 permission keys and per-user overrides (grant/deny individual permissions on top of role defaults)
- **Audit log** — immutable trail of every mutation with who, what, when, and before/after JSON snapshots; filterable admin viewer with pagination
- **Admin UI** — user management panel with role assignment, per-user permission editor with role default / override / effective columns, audit log viewer, and info tooltips
- **Authentication** — NextAuth v5 with Google and GitHub OAuth; JWT strategy with permission-enriched tokens; automatic superuser bootstrapping on first login
- **Guest mode** — unauthenticated users see read-only chip views of persons and teams; manage routes redirect to home
- **Permission-aware UI** — server-side permission guards on all mutations; client-side conditional rendering hides UI elements the user can't access
- **Relational integrity** — database constraints enforced at ORM level with cascading rules
- **Dark UI** — MUI dark theme with consistent component styling throughout
- **Type-safe** — end-to-end TypeScript with Zod schema validation and centralized inferred types
- **Server-first** — async Server Components for data fetching, Server Actions for mutations inside `$transaction` blocks
- **Thoroughly tested** — 439 Jest tests across six layers with 94%+ line coverage: Zod schemas, RBAC logic, Prisma queries, server actions, audit logging, and all UI components

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
| `DATABASE_URL`       | Prisma database URL          |
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

```bash
npx prisma migrate dev --name init
```

> This creates the SQLite database file (`prisma/dev.db`) and builds all the tables according to the schema in `prisma/schema.prisma`. It also generates the Prisma client — the type-safe query builder the app uses to talk to the database. You only need to run this once on a fresh clone, or again whenever the schema changes.

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
npm run test:server # query + server action tests (Node, real SQLite)
npm run test:all    # both suites
```

> The project has **439 tests** split into two suites. `npm test` runs the client-side tests — component rendering, user interactions, form validation, Zod schema parsing, and RBAC permission resolution — all in a jsdom environment. `npm run test:server` runs the server-side tests against a real SQLite test database — every Prisma query, every server action mutation (including admin role/permission management), audit log creation, audit log queries, UUID validation, duplicate prevention, and cascade deletes. The test database (`prisma/test.db`) is created automatically the first time you run it and never touches your dev data.

---

### Format code

```bash
npm run format
```

> Runs Prettier across all source files and rewrites them to match the project's code style. This is the source of truth for formatting — consistent indentation, quote style, trailing commas, and line width. Run `npm run format:check` if you want to verify formatting without changing any files.

---

## Tech stack

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| Framework         | Next.js 16 (App Router, Server Components)   |
| UI library        | React 19 (`useActionState`, `<form action>`) |
| Component library | MUI v7 (Material UI)                         |
| Language          | TypeScript 5.9                               |
| ORM               | Prisma 6 (`relationLoadStrategy: 'join'`)    |
| Database          | SQLite (dev)                                 |
| Validation        | Zod 4                                        |
| Auth              | NextAuth v5 (JWT, Google + GitHub OAuth)     |
| Testing           | Jest 30 + React Testing Library              |
| Linting           | ESLint 9 (flat config)                       |
| Formatting        | Prettier 3                                   |

---

## Architecture

The app uses Next.js App Router with a clear separation of concerns:

- **Server Components** fetch data at the page level and pass it as props to client components — no `useEffect` data fetching
- **Server Actions** (`serverActions.ts`) handle all mutations inside `$transaction` blocks for atomicity
- **Read queries** (`queries.ts`) are separated from mutations and validated through Zod schemas
- **Centralized types** (`schemas.ts`) — Zod schemas export inferred `Person`, `CombinedTeam`, `AppUser`, `AuditLog`, and `Permissions` types used across all components
- **Forms** use React 19's `useActionState` for error handling with built-in pending state
- **Auth** (`auth.ts`) — NextAuth v5 with JWT strategy; protected routes redirect unauthenticated users; guest mode shows read-only chip views
- **RBAC** (`permissions.ts`) — granular permission system with role defaults, per-user overrides, and server-side guards on every mutation
- **Audit logging** (`auditLog.ts`) — every mutation is logged with before/after snapshots inside the same transaction for atomicity

```
src/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── admin/                   # User management (superuser-protected)
│   │   └── audit/               # Audit log viewer (permission-protected)
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
└── schema.prisma     # Data model (Person, Team, User, Permission, UserPermission, AuditLog)
```

---

## Data model

```
Person          Team             User              Permission
├── id          ├── teamId       ├── id             ├── id
├── name        ├── teamName     ├── email          ├── key
├── email       ├── managerId    ├── name           └── description
├── position    └── members[]    ├── role
└── manager?                     └── permissions[]   UserPermission
                                                     ├── userId
AuditLog                                             ├── permissionId
├── id                                               └── granted
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
- **Team** — teams with a name, optional manager (FK to Person), and members via join table
- **User** — authenticated identity from OAuth, with role (superuser/administrator/user/guest)
- **Permission** — catalog of 16 granular permission keys (e.g. `person:create`, `team:delete`, `admin:manage_users`)
- **UserPermission** — per-user permission overrides (grant/deny) with role-default fallback
- **AuditLog** — immutable log entries with denormalized user info (no FK), action type, entity reference, and JSON before/after snapshots

---

## RBAC permission system

The app implements a granular Role-Based Access Control system with four roles and 16 permission keys:

| Role          | Default permissions                                                                  |
| ------------- | ------------------------------------------------------------------------------------ |
| Superuser     | All permissions (immutable — cannot be modified or assigned via UI)                  |
| Administrator | All person and team operations + audit log access (no data reset, seed, or admin UI) |
| User          | Read-only (person:read, team:read)                                                   |
| Guest         | Read-only (same as user, but unauthenticated)                                        |

**Permission resolution precedence**: superuser (always all) → explicit UserPermission override → role default.

Individual permissions can be overridden per-user through the admin UI — for example, granting `person:create` to a regular user, or denying `team:delete` from an administrator. The first user to log in via OAuth is automatically bootstrapped as the superuser.

---

## Testing

439 tests across 27 test suites, covering every layer of the application:

| Layer              | Tests | What's covered                                                                                                                                                                                                                                                                      |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod schemas**    | 60    | PersonSchema, TeamSchema, TeamMemberSchema, UserSchema, PermissionsSchema, AuditLogSchema, AuditLogFilterSchema, AuditActionSchema, AuditEntityTypeSchema — valid data, missing fields, invalid UUIDs, nullable fields, wrong types, enum validation                                |
| **Prisma queries** | 33    | `getPersons`, `getTeams`, `getUsers`, `getUserById`, `getAllPermissionKeys`, `getAuditLogs`, `getAuditLogUserEmails` against real SQLite — filtering, pagination, ordering, empty state, distinct emails                                                                            |
| **Server actions** | 78    | All 14 mutations — CRUD for persons/teams/members, admin role updates, permission override grant/deny/reset, mock data seeding, UUID validation, duplicate prevention, cascade deletes, superuser protection, idempotent seed with upserts                                          |
| **Audit logging**  | 6     | `logAudit` — user info capture, null user (unauthenticated), JSON serialization of before/after, undefined handling, null entityId, transaction client usage                                                                                                                        |
| **RBAC logic**     | 27    | `resolvePermissions`, `getCurrentUser`, `getUserPermissions`, `hasPermission`, `requirePermission`, `seedPermissions` — superuser immunity, role defaults, grant/deny overrides, session lookup, unauthenticated fallback, permission seeding                                       |
| **UI components**  | 235   | All 23 components — rendering, user interactions, keyboard accessibility, form validation, permission-based visibility, role chips, selection cards, minimal/full views, empty states, router navigation, admin menu links, audit log filtering, reset/seed dialogs, error handling |

```
Coverage summary (combined client + server suites)
  Statements : 93.60%
  Branches   : 88.58%
  Functions  : 93.98%
  Lines      : 94.40%
```

Highlights: `auditLog.ts`, `permissions.ts`, `queries.ts`, `schemas.ts`, and `serverActions.ts` at 97–100% line coverage. Server-side tests run against an isolated test database (`prisma/test.db`) — the dev database is never touched.

---

## Roadmap

- Department-level grouping
- Cloud deployment (AWS Fargate + RDS)

---

### Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
