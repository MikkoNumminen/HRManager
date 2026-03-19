# HRManager – Claude Code Rules

## Project overview

A full-stack HR management system for managing employees and teams.
Built with Next.js 16 (App Router), React 19, MUI v7, Prisma 6, Zod 4, TypeScript 5.9, Jest 30.

This is a **portfolio / showcase project**. The goal is to demonstrate technical depth and breadth, not to ship the leanest possible product. Features are intentionally built to production-grade complexity (e.g. granular per-user RBAC instead of simple role checks) to showcase what the developer can build. When in doubt, favour the more thorough implementation.

`README.md` is the **show window for potential employers** — it must always reflect the current state of the project accurately, with up-to-date test counts, feature lists, architecture descriptions, and file structure. Keep it polished and impressive. **Any code change that affects features, architecture, data model, file structure, test counts, or coverage MUST include a corresponding README.md update** (as a separate docs commit). Never leave README.md out of date.

## Tech stack

| Layer      | Technology                                                     |
| ---------- | -------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components)                     |
| UI         | React 19 + MUI v7 — dark theme throughout, no Tailwind         |
| Language   | TypeScript 5.9                                                 |
| ORM        | Prisma 6 (`relationLoadStrategy: 'join'`)                      |
| Database   | SQLite (dev), `prisma/dev.db` (not committed)                  |
| Validation | Zod 4                                                          |
| Auth       | NextAuth v5 (JWT strategy, Google + GitHub OAuth)              |
| Testing    | Jest 30 + React Testing Library                                |
| Linting    | ESLint 9 (flat config)                                         |
| Formatting | Prettier 3 (`printWidth: 100`, double quotes, trailing commas) |

## Architecture

- **Reads** go in `queries.ts` (no `"use server"`). Validated through Zod schemas.
- **Mutations** go in `serverActions.ts` (marked `"use server"`). Always inside `prisma.$transaction()` — even single operations. Every mutation is audit-logged via `logAudit()` from `auditLog.ts` inside the same transaction for atomicity.
- **Audit logging** — `auditLog.ts` provides `logAudit()` which records who, what action, which entity, and before/after JSON snapshots. Uses `getCurrentUser()` for actor identity. Accepts optional `tx` param to run inside an existing transaction. No FK to User — logs survive user deletion.
- Pages are async Server Components that fetch data and pass it as props to Client Components. No `useEffect` data fetching.
- Forms use React 19's `useActionState` with `action=` prop, not `onSubmit`.
- Types are derived from Zod schemas in `schemas.ts` via `z.infer` — `Person`, `CombinedTeam`, `AppUser`, `AuditLog`, `Permissions`. Do not create duplicate interfaces in components.
- MUI style tokens and component styles are centralized in `muiStyles.ts`.
- **Info tooltips**: Use MUI `Tooltip` with `arrow` and `cursor: "help"` on column headers or labels that may not be self-explanatory. Keep tooltip text concise but informative. Apply this consistently across all data tables and editor views.
- **Auth** is configured in `auth.ts` (NextAuth v5). Protected routes use `auth()` + `redirect("/")` in Server Components. Client components use `useSession` via `SessionProvider` wrapper in layout.
- **Guest mode**: unauthenticated users see read-only minimal views (MUI Chips) of Persons and Teams on the main page. Manage routes (`/managePersons`, `/manageTeams`) redirect to `/`.
- **TopBar** — the user avatar dropdown menu contains: User Management, Audit Log (permission-gated), Load Mock Data, Reset All Data (permission-gated), and Sign Out. Dev tools (seed/reset) are only visible when the `permissions` prop is passed (home page only).
- **Client-heavy rendering**: Keep the server thin — it handles only data fetching, auth, and validation. All rendering logic, UI state, filtering, sorting, and heavy computation belong in Client Components so the server stays lightweight and responsive. Security-sensitive logic (auth checks, input sanitization, access control, database queries) must always remain server-side — never trust the client for authorization or data integrity.
- **SQLite single-writer constraint** — SQLite cannot handle concurrent write transactions. Never nest `$transaction` calls. In `seedMockData`, separate transactions run sequentially (main data → cleanup → `seedPermissions()` → user creation) to avoid deadlock.

## File structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── admin/                   # User management (superuser-protected)
│   │   └── audit/               # Audit log viewer (permission-protected)
│   ├── managePersons/           # Person management (permission-protected)
│   └── manageTeams/             # Team management (permission-protected)
├── components/       # Reusable MUI client components
├── tests/            # Jest tests
├── types/            # TypeScript module augmentations (next-auth.d.ts)
├── auditLog.ts       # Audit logging helper (logAudit)
├── auth.ts           # NextAuth v5 configuration + RBAC callbacks
├── db.ts             # Prisma singleton
├── muiStyles.ts      # Centralised MUI style tokens
├── permissions.ts    # RBAC: role defaults, permission resolution, guards
├── queries.ts        # Read-only data fetching
├── schemas.ts        # Zod schemas and inferred types
└── serverActions.ts  # Mutation server actions
prisma/
└── schema.prisma     # Data model
```

## Data model

- **Person** — name, email, title, optional manager (FK to Person). Can belong to multiple teams.
- **Team** — name, manager (FK to Person), members via TeamMember join table.
- **TeamMember** — join table between Person and Team, cascade delete on removal.
- **User** — authenticated identity (email, name, image, role). Linked to NextAuth OAuth.
- **Permission** — catalog of 16 granular permission keys (e.g. `person:create`, `team:delete`).
- **UserPermission** — per-user permission overrides (grant/deny) with role-default fallback.
- **AuditLog** — immutable log of all mutations: who, what action, which entity, before/after JSON snapshots. No FK to User so logs survive user deletion.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

- Do **not** run `git commit` — only provide the commit message as text so the user can commit manually.
- On large multi-file features, **pause at natural commit boundaries** and provide a commit message before continuing. Don't wait until everything is done — commit early and often at logical checkpoints (e.g. schema + migration, then core logic, then UI, then tests).
- **STOP after every commit boundary.** Provide the commit message, list the files included, and **wait for the user to confirm** before writing any more code. The user needs to commit and push each change separately and in order. **Never continue to the next commit's work without explicit confirmation.** This is non-negotiable.
- **Before providing any commit message, update ALL affected files first.** If the code change affects test counts, coverage, features, architecture, or file structure, update `README.md` (and any other stale files) **before** presenting the commit message. Never provide a commit message while dependent files are still out of date.
- Changes to `CLAUDE.md` or `README.md` must be committed **separately** from code changes — always provide a dedicated `docs()` commit message for them.

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
- **Always aim for maximum coverage.** There is no reason to hold back — add as many tests as needed to cover every branch, edge case, and interaction. This is a portfolio project; comprehensive test coverage is a strength, not over-engineering.

## Roadmap (do not implement unless asked)

- Department-level grouping
- CI/CD pipeline (GitHub Actions)
- Cloud deployment (AWS Fargate + RDS)
