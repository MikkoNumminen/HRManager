# Contributing

## All changes go through pull requests

`main` is a **protected branch**: direct pushes are rejected and every change must
land via a reviewed pull request with green CI. This is enforced by GitHub branch
protection — opening a PR is the only path to `main`.

### Workflow

1. Branch off `main`: `git checkout -b <type>/<short-description>`.
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
   (`fix:`, `feat:`, `docs:`, `chore:`, …).
3. Push the branch and open a PR against `main`.
4. CI must pass: formatting, lint, typecheck (`tsc --noEmit`), the full
   DB-backed Jest suite with coverage, the production build, and the Playwright
   e2e job.
5. Merge via the PR once it is approved and all checks are green.

### Local checks before pushing

The `pre-push` hook runs the full DB-backed suite (`npm run test:all`), which
needs PostgreSQL (MongoDB is provided in-memory by the tests). Start a local
database first — `docker compose up -d postgres mongo` — or point a local
`.env.test` at a running instance. CI provisions these automatically.

### Required production secrets

`AUTH_SECRET`, `AUDIT_HMAC_SECRET`, and `TOTP_ENCRYPTION_KEY` must be set in any
production deployment — the app fails closed without them. On long-running
deployments (Docker/Kubernetes) also set `WORKERS_ENABLED=true`. See
[.env.example](.env.example) for the full list.
