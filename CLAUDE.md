# Project Rules

## Commit style
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Database
- All mutations must be wrapped in `prisma.$transaction()` — even single operations. Transactions are a fundamental guarantee for atomicity.

## Architecture
- **Reads** go in `queries.ts` (not marked `"use server"`). **Mutations** go in `serverActions.ts` (marked `"use server"`).
- Pages are async Server Components that fetch data and pass it as props to client components. No `useEffect` data fetching.
- Forms use React 19's `useActionState` with `action=` prop, not `onSubmit`.
- Types are derived from Zod schemas in `schemas.ts` via `z.infer`. Do not create duplicate interfaces in components.

## Testing
- Run `npm test` after changes to verify all tests pass.
- Update affected tests when modifying component APIs.
