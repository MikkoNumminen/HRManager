# Contributing

HRManager is a portfolio / showcase project. Contributions (and automated
agents) are welcome as long as they keep the bar high: production-grade code,
green gates, and accurate docs.

## Before you start

Read **[`AGENTS.md`](AGENTS.md)** — it is the canonical contract (stack,
architecture rules, the verification ladder, footguns, and commit conventions).
Claude Code users also have **[`CLAUDE.md`](CLAUDE.md)** and the
`.claude/skills/` procedures.

## Local setup

See **[README → Getting started](README.md#getting-started)**. In short:

```bash
npm ci
cp .env.example .env && npx auth secret    # fill in secrets
npx prisma migrate dev
npm run dev
# tests need a test DB:
cp .env.test.example .env.test
npm run test:all
```

## The change loop

1. Branch off `main` (never commit to `main` directly).
2. Make the change in the relevant `src/features/<domain>/` module; update
   `README.md` if features/architecture/tests/structure changed.
3. Run the verification ladder (mirrors CI): `npm run format` → `npm run lint`
   → `npm run typecheck` → `npm run check:error-codes` → targeted tests →
   `npm run test:all`. Server tests share one DB — never run two suites at once.
4. Commit in logical, [Conventional-Commits](https://www.conventionalcommits.org/)
   units (one concern each). Keep `README.md` / `CLAUDE.md` / `AGENTS.md`
   changes in their own `docs()` commits, separate from code. Do **not** add
   `Co-Authored-By` trailers or AI/instance names.
5. Open a PR. CI runs format → lint → typecheck → error-code coverage →
   tests + coverage → `next build`, plus Stryker mutation testing. PRs are
   **rebase-merged** to preserve history.

## Security

Found a vulnerability? **Do not open a public issue** — see
**[`SECURITY.md`](SECURITY.md)** for private reporting and the security
invariants you must preserve when editing auth / RBAC / the audit trail.
