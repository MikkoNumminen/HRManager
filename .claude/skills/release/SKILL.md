---
name: release
description: Merge a reviewed PR and shepherd it to production on Vercel — required checks, rebase-merge convention, deploy verification, ignoreCommand quirks, migration gating, and feature-flag cutovers. Use when merging a PR, releasing to production, or verifying a deploy landed.
---

# Release: merge → deploy → verify → (cutover)

How a change ships in this repo. The deploy target is Vercel (Hobby tier); the
only **required** status check is `ci` (strict: the branch must be up to date
with `main`). `Stryker Mutation Score` and the Vercel preview are advisory.

## 1. Pre-merge

- `gh pr checks <n>` — `ci` must pass. Stryker red is non-blocking but look at
  WHY (its history of silent breakage is in git log).
- The Vercel **preview** deploy is historically flaky and skips migrations by
  design — a red preview does not predict production. Production deploys from
  `main` have been reliable.
- Branch must be up to date with `main` (strict check). If `main` moved:
  `git rebase origin/main` + force-push with lease, let `ci` re-run.

## 2. Merge

- **Rebase-merge** (`gh pr merge <n> --rebase`) — preserves the per-finding
  conventional commits; this repo never squashes review history away.
- If `gh pr merge` returns a transient 401, use the REST endpoint:
  `gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge -f merge_method=rebase`.

## 3. Production deploy

- Merging to `main` triggers the production build. Watch it:
  `gh api repos/<owner>/<repo>/commits/<main-sha>/statuses --jq '[.[] | select(.context=="Vercel")][0]'`
- `scripts/vercel-ignore.sh` **skips** builds when the push touches only docs
  (`*.md`), tests, CI config, or jest/playwright/stryker configs — and skips
  same-commit redeploys ("Deployment canceled by Ignored Build Step" is this,
  not a failure). Push a code change to force a build.
- **Migrations run only on production deploys** (`scripts/vercel-build.sh`,
  `VERCEL_ENV=production`). Previews share the production DATABASE_URL on
  Hobby, so unreviewed migrations never run from a preview. Migrations must be
  additive/deploy-safe; anything destructive needs a dedicated plan.

## 4. Verify

- Production Vercel status `success`, then spot-check the live app (the demo
  login flow is the cheapest end-to-end probe).
- If the change touched audit logging or jobs: `/api/health` + `/api/ready`
  for connectivity; the admin jobs/audit pages for behavior.

## 5. Feature-flag cutovers

Risky behavior changes ship dark behind a DB feature flag (seeded by
migration, default off — see `audit-use-outbox` for the pattern):

1. Merge + deploy with the flag **off** (behavior identical, fully reversible).
2. Flip the flag in the admin UI (atomic across instances, no redeploy) — or
   `FEATURE_FLAG_<NAME>=true` env var, which needs a redeploy and overrides DB.
3. Verify the new path with a real mutation.
4. Rollback = flip the flag off. Remove the flag in a later cleanup PR once
   the new path is proven.

## Cron endpoints

Scheduled work runs via CRON_SECRET-gated routes in `vercel.json` `crons`
(Hobby: max 2 cron jobs, effectively daily). After adding one, confirm the
schedule appears in the Vercel dashboard post-deploy, and remember external
schedulers can POST with `Authorization: Bearer $CRON_SECRET` for tighter
intervals.
