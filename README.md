# HRManager

A full-stack HR management system for managing employees and teams — built with Next.js 16, React 19, MUI v7, Prisma, and TypeScript.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-7-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?style=flat-square&logo=zod)
![Jest](https://img.shields.io/badge/Tested_with-Jest_30-C21325?style=flat-square&logo=jest)

---

## Features

- **People management** — add, update and remove employees with name, email and position
- **Team management** — create teams, assign managers, add and remove members
- **Relational integrity** — database constraints enforced at ORM level with cascading rules
- **Dark UI** — MUI dark theme with consistent component styling throughout
- **Type-safe** — end-to-end TypeScript with Zod schema validation and centralized inferred types
- **Server-first** — async Server Components for data fetching, Server Actions for mutations
- **Tested** — Jest unit and integration tests covering core components and server actions

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run tests

```bash
npm test
```

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
| Testing           | Jest 30 + React Testing Library              |
| Linting           | ESLint 9 (flat config)                       |

---

## Architecture

The app uses Next.js App Router with a clear separation of concerns:

- **Server Components** fetch data at the page level and pass it as props to client components — no `useEffect` data fetching
- **Server Actions** (`serverActions.ts`) handle all mutations inside `$transaction` blocks for atomicity
- **Read queries** (`queries.ts`) are separated from mutations and validated through Zod schemas
- **Centralized types** (`schemas.ts`) — Zod schemas export inferred `Person` and `CombinedTeam` types used across all components
- **Forms** use React 19's `useActionState` for error handling with built-in pending state

```
src/
├── app/              # Pages (async Server Components) and routes
├── components/       # Reusable MUI client components
├── db.ts             # Prisma singleton
├── muiStyles.ts      # Centralised style tokens and component styles
├── queries.ts        # Read-only data fetching (Prisma + Zod validation)
├── schemas.ts        # Zod schemas and exported TypeScript types
└── serverActions.ts  # Mutation server actions (Prisma $transaction)
prisma/
└── schema.prisma     # Data model and migrations
```

---

## Roadmap

- User authentication (NextAuth)
- Top navigation bar
- Department-level grouping
- CI/CD pipeline (GitHub Actions)
- Cloud deployment (AWS Fargate + RDS)

---

### Commit style: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
