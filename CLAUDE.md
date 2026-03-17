# HRManager – Claude Code Rules

## Project overview
A full-stack HR management system for managing employees and teams.
Built with Next.js 16 (App Router), React 19, MUI v7, Prisma 6, Zod 4, TypeScript 5.9, Jest 30.

## Tech stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| UI | React 19 + MUI v7 — dark theme throughout, no Tailwind |
| Language | TypeScript 5.9 |
| ORM | Prisma 6 (`relationLoadStrategy: 'join'`) |
| Database | SQLite (dev), `prisma/dev.db` (not committed) |
| Validation | Zod 4 |
| Testing | Jest 30 + React Testing Library |
| Linting | ESLint 9 (flat config) |

## Architecture
- **Reads** go in `queries.ts` (no `"use server"`). Validated through Zod schemas.
- **Mutations** go in `serverActions.ts` (marked `"use server"`). Always inside `prisma.$transaction()` — even single operations.
- Pages are async Server Components that fetch data and pass it as props to Client Components. No `useEffect` data fetching.
- Forms use React 19's `useActionState` with `action=` prop, not `onSubmit`.
- Types are derived from Zod schemas in `schemas.ts` via `z.infer` — `Person` and `CombinedTeam`. Do not create duplicate interfaces in components.
- MUI style tokens and component styles are centralized in `muiStyles.ts`.

## File structure
```
src/
├── app/              # Pages (async Server Components)
├── components/       # Reusable MUI client components
├── tests/            # Jest tests
├── db.ts             # Prisma singleton
├── muiStyles.ts      # Centralised MUI style tokens
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

## Commit style
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- Do **not** run `git commit` — only provide the commit message as text so the user can commit manually.

## Testing
- Run `npm test` after every change.
- Update affected tests when modifying component APIs.
- Tests live in `src/tests/`.
- Do not mock core logic — test real functionality.

## Roadmap (do not implement unless asked)
- User authentication (NextAuth)
- Top navigation bar
- Department-level grouping
- CI/CD pipeline (GitHub Actions)
- Cloud deployment (AWS Fargate + RDS)