---
name: add-feature
description: Add a new feature module / entity end-to-end — the S-Q-A scaffold plus every piece of external wiring (barrels, route, nav, permissions, prisma, i18n, audit enum, tests, a11y). Use when adding an entity, a CRUD feature, or auditing whether an existing feature is fully wired.
---

# Add a feature: scaffold + wiring checklist

Copy the closest existing feature instead of writing from scratch —
`src/features/positions/` is the minimal CRUD specimen, `src/features/leave/`
the comprehensive one (note: leave's UI lives at `src/components/LeaveManager/`
as a documented legacy exception — copy positions' layout, not that). Every box
below is a place an inconsistent feature has actually drifted; check them all.

## 1. The feature directory (`src/features/<entity>/`)

| File                   | Must contain                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas.ts`           | Zod schema + `z.infer` type export; shared limits from `@/schemas/shared`                                                                                                                                                                                                                                                                                                                |
| `queries.ts`           | `hasPermission()` check; `getDemoSessionId()` + `sessionId` in every `where` along with `deletedAt: null`; high-traffic reads wrapped in `cache(fn, [key], { revalidate: 300, tags: [ORG_DATA_TAG] })`                                                                                                                                                                                   |
| `actions.ts`           | `"use server"`; every mutation = `guardedAction("<entity>:<perm>", "<actionName>", fn)` (auth + rate-limit + safe built in) around `withAuditedTransaction((tx, addAudit) => …)`; `validateUUID` on id params; `ActionError("<code>", t("<code>"))` for failures; after commit `revalidatePath()` + `invalidateOrgCache()` (or `invalidateDashboardCache()` when dashboard data changed) |
| `components/*.tsx`     | `"use client"`; `useActionState` forms, `useOptimistic` for creates; `useSnackbar()`; `useTranslations("<namespace>")`; permission gating via the `permissions` prop; styles from `@/muiStyles` only                                                                                                                                                                                     |
| `__tests__/*.test.tsx` | `jest.mock` the feature's actions; `make<Entity>()` fixture factories; permission fixtures; one-line comment above every test; cover permission gating + success + each error path                                                                                                                                                                                                       |

## 2. External wiring (the part everyone forgets)

| #   | Where                                                                  | What                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/queries.ts`, `src/serverActions/index.ts`, `src/schemas/index.ts` | barrel re-exports for queries / actions / schemas                                                                                                                                                 |
| 2   | `src/app/<entity>/page.tsx`                                            | async server page: `auth()` redirect, permission redirect, fetch via queries, render TopBar + client component                                                                                    |
| 3   | `src/components/TopBar/NavMenu.tsx`                                    | `can<Entity>` flag + nav item gated on it                                                                                                                                                         |
| 4   | `src/permissions.ts`                                                   | key in `PERMISSION_KEYS`, grants in `ROLE_DEFAULTS`, text in `formatPermissionDescription()` — then fix the permission COUNT in README + docs/architecture.md (source of truth note in CLAUDE.md) |
| 5   | `prisma/schema.prisma` + migration                                     | model with `sessionId String?`, `deletedAt DateTime?`, timestamps; `@@index([deletedAt])`, `@@index([sessionId])`; natural-key `@@unique([…, sessionId])`. Migration must be additive/deploy-safe |
| 6   | `messages/en.json` + 17 locales                                        | `<entity>` + `<entity>Notifications` namespaces, permission description — full procedure in the `i18n` skill                                                                                      |
| 7   | `src/features/audit/schemas.ts`                                        | add the entity to `AuditEntityTypeSchema` — `addAudit`'s entityType is typed from it, so a missing entry is a compile error (and the audit READ path parses against it)                           |
| 8   | `src/actionErrors.ts`                                                  | new `ErrorCode` members (manual union — see the `i18n` skill for the 3-step coupling)                                                                                                             |
| 9   | `src/tests/server/serverActions.<entity>.test.ts`                      | mock set copied from a neighbor (db/auth/permissions/auditLog/rateLimit/demoSession/next-cache/next-navigation); success + every error code                                                       |
| 10  | `src/tests/server/testDb.ts`                                           | `createTest<Entity>()` factory + the model in `cleanDb()`'s truncate list                                                                                                                         |
| 11  | `src/tests/shared/accessibility.test.tsx`                              | register the main client component for the axe WCAG pass (existing gap: PositionCatalogClient was never added — don't copy that omission)                                                         |
| 12  | `src/seeds.ts` / demo seeding                                          | seed data if the demo should showcase the entity                                                                                                                                                  |

## 3. Judgment calls to make explicitly

- **Deletion impact**: if other entities reference this one, follow the
  `getPersonDeleteImpact` pattern (pre-delete impact query + confirm dialog)
  instead of letting FK errors surface.
- **Realtime**: mutations that should appear live in other sessions need an
  event via the audit/emit path (see how person/team mutations emit).
- **Component home**: feature-scoped UI lives in the feature's `components/`;
  only genuinely shared multi-feature UI goes in `src/components/`.

## 4. Verify

Run the `verify` skill's ladder; for a new feature that means at minimum
`serverActions.<entity>` + the component tests + the a11y suite, then the full
suite. Update README feature list (CLAUDE.md rule) and run
`npm run readme:test-table` so the test counts stay measured, not guessed.
