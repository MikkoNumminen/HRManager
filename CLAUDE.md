# HRManager – Claude Code Rules

## Vittu clause

When "vittu" appears in the user's prompt: max speed, aggressive subagents for independent tasks in parallel, no confirmations between steps.

## Task tracking

`TODO.md` is the shared task list across all Claude Code sessions. Read it at the start of every session. Update it when tasks are added, started, or completed. Keep it concise — no completed items, just in-progress and backlog. After finishing a task, note how long it took before removing it.

Every TODO item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large. In text: 🟢 **[S]**, 🟡 **[M]**, 🔴 **[L]**.

Every TODO item must have an LLM marker: ⚡ Sonnet-capable (mechanical, repetitive, well-defined) or 🧠 Opus recommended (architectural, complex reasoning, multi-file). Place after size emoji: `🟢⚡` or `🟡🧠`. After completing a task, assess and tag new items.

**⚠️ MANDATORY: 4 permanent Claude instances: Claude 1, Claude 2, Claude 3, Claude 4.** Names assigned by user — never pick your own. Ask if you don't know. Move tasks to "In Progress" with your name, e.g. `[Claude 1, main]` or `[Claude 3, worktree-name]`. Unmarked work causes collisions. **No exceptions. No silent work.**

**🚨 If you pause or stop mid-task, your "In Progress" entry MUST remain until the work is committed and pushed.** Other instances depend on this to avoid collisions.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

- Do **not** run `git commit` — provide the message as text for the user to commit manually.
- **Pause at natural commit boundaries.** List files, provide message, **wait for user confirmation** before continuing. Non-negotiable.
- **Before providing any commit message, update ALL affected files first** (README.md, etc.). Never provide a commit message while dependent files are still out of date.
- Changes to `CLAUDE.md` or `README.md` must be committed **separately** from code — use a `docs()` commit.
- **⚠️ After every push, re-read `TODO.md` and present the full task list.**
- **⚠️ When editing any `.md` file, re-read it and present the content back to the user.**

## Project overview

Full-stack HR management system. **Portfolio / showcase project** — favour thorough, production-grade implementations.

`README.md` is the **show window for employers** — keep it accurate and polished. **Any code change affecting features, tests, architecture, or file structure MUST include a README.md update** (separate docs commit).

## Tech stack

Next.js 16 (App Router) · React 19 · MUI v7 (dark theme, no Tailwind) · TypeScript 5.9 · Prisma 7 · PostgreSQL + MongoDB 8 (audit logs) · Zod 4 · NextAuth v5 (JWT, Google/GitHub OAuth + demo login) · next-intl (18 locales) · Jest 30 + RTL · ESLint 9 · Prettier 3 · GitHub Actions CI · Vercel deployment

## Architecture rules

- **Reads** in `queries.ts`, **mutations** in `serverActions.ts` (`"use server"`), always inside `prisma.$transaction()`.
- **Audit logging** to MongoDB via `auditLog.ts` using deferred `after()` writes. No FK to User.
- Pages are async Server Components passing props to Client Components. No `useEffect` data fetching.
- Forms use `useActionState` with `action=` prop. Create forms use `useOptimistic`.
- Types derived from Zod schemas in `schemas.ts` via `z.infer`. No duplicate interfaces.
- MUI styles centralized in `muiStyles.ts`.
- Never nest `$transaction` calls.
- Security logic (auth, validation, access control, DB queries) stays server-side.

## Testing

- **Always run tests** (`npm run test:all`) after code changes (logic, components, actions, queries). Never `npm test` alone.
- **Skip tests** after docs-only commits (README, CLAUDE.md, TODO.md) or formatting-only runs.
- **Targeted tests first** — if only one file changed, run its test file first; full suite before final push.
- Tests in `src/tests/`. Comment above each test explaining what it does.
- Every new schema/component/module must have tests. Aim for 100% coverage.
- Do not mock core logic — test real functionality.

## Formatting

- Prettier is source of truth. Run `npm run format` after every change.
- ESLint uses `eslint-config-prettier` to avoid conflicts.
