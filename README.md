# HRManager

A full-stack HR management system for managing employees and teams — built with Next.js 14, MUI, Prisma, and TypeScript.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![MUI](https://img.shields.io/badge/MUI-5-007FFF?style=flat-square&logo=mui)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Jest](https://img.shields.io/badge/Tested_with-Jest-C21325?style=flat-square&logo=jest)

---

## Features

- **People management** — add, update and remove employees with name, email and position
- **Team management** — create teams, assign managers, add and remove members
- **Relational integrity** — database constraints enforced at ORM level with cascading rules
- **Dark UI** — MUI dark theme with consistent component styling throughout
- **Type-safe** — end-to-end TypeScript with Zod schema validation on data boundaries
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

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | MUI v5 (Material UI) |
| ORM | Prisma 5 |
| Database | SQLite (dev) |
| Validation | Zod |
| Testing | Jest + React Testing Library |

---

## Architecture

The app uses Next.js App Router with **Server Actions** for all data mutations — no separate API layer needed. UI components are fully client-side MUI with a shared style system in `muiStyles.ts`. The database schema is in 3NF with Prisma managing migrations.

```
src/
├── app/              # Pages and server actions
├── components/       # Reusable MUI client components
├── muiStyles.ts      # Centralised style tokens and component styles
├── schemas.ts        # Zod validation schemas
└── serverActions.ts  # All database operations (Prisma)
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
