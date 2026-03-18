# HRManager

A full-stack HR management system for managing employees and teams — built with Next.js 16, React 19, MUI v7, Prisma, and TypeScript.

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
- **Authentication** — NextAuth v5 with Google and GitHub OAuth; guest mode with read-only views
- **Relational integrity** — database constraints enforced at ORM level with cascading rules
- **Dark UI** — MUI dark theme with consistent component styling throughout
- **Type-safe** — end-to-end TypeScript with Zod schema validation and centralized inferred types
- **Server-first** — async Server Components for data fetching, Server Actions for mutations
- **Thoroughly tested** — 218 Jest tests across three layers: Zod schemas, Prisma queries, server actions, and all UI components (99%+ line coverage)

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

> The project has **218 tests** split into two suites. `npm test` runs the client-side tests — component rendering, user interactions, form validation, and Zod schema parsing — all in a jsdom environment. `npm run test:server` runs the server-side tests against a real SQLite test database — every Prisma query, every server action mutation, UUID validation, duplicate prevention, and cascade deletes. The test database (`prisma/test.db`) is created automatically the first time you run it and never touches your dev data.

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
- **Centralized types** (`schemas.ts`) — Zod schemas export inferred `Person` and `CombinedTeam` types used across all components
- **Forms** use React 19's `useActionState` for error handling with built-in pending state
- **Auth** (`auth.ts`) — NextAuth v5 with JWT strategy; protected routes redirect unauthenticated users; guest mode shows read-only chip views

```
src/
├── app/
│   ├── api/auth/[...nextauth]/  # NextAuth route handler
│   ├── managePersons/           # Person management (auth-protected)
│   └── manageTeams/             # Team management (auth-protected)
├── components/       # Reusable MUI client components
├── tests/            # Jest tests
├── auth.ts           # NextAuth v5 configuration
├── db.ts             # Prisma singleton
├── muiStyles.ts      # Centralised style tokens and component styles
├── queries.ts        # Read-only data fetching (Prisma + Zod validation)
├── schemas.ts        # Zod schemas and exported TypeScript types
└── serverActions.ts  # Mutation server actions (Prisma $transaction)
prisma/
└── schema.prisma     # Data model and migrations
```

---

## Testing

218 tests across 22 test suites, covering every layer of the application:

| Layer              | Tests | What's covered                                                                                                                                                                |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zod schemas**    | 27    | Valid data, missing fields, invalid UUIDs, nullable fields, wrong types                                                                                                       |
| **Prisma queries** | 12    | `getPersons` and `getTeams` against a real SQLite DB — empty state, null managers, member shapes, multi-team scenarios                                                        |
| **Server actions** | 50    | All 10 mutations — create, update, delete for persons/teams/members, UUID validation, duplicate email prevention, cascade deletes, whitespace trimming, transaction atomicity |
| **UI components**  | 129   | Rendering, user interactions, keyboard accessibility, form validation, minimal/chip views, empty states, null field handling, router navigation                               |

```
Coverage summary
  Statements : 98.74%
  Branches   : 90.60%
  Functions  : 98.73%
  Lines      : 99.64%
```

Server-side tests run against an isolated test database (`prisma/test.db`) — the dev database is never touched.

---

## Roadmap

- Department-level grouping
- CI/CD pipeline (GitHub Actions)
- Cloud deployment (AWS Fargate + RDS)

---

### Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
