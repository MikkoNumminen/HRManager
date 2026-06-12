# Rollback runbook

How to undo each class of change in production. Ordered from most to least
common; every section is safe to execute under pressure.

## 1. Bad deploy (code)

Fastest: **Vercel dashboard → Deployments → previous production deploy →
"Instant Rollback"** (no build, seconds). The git history is then ahead of
production — follow up with a `git revert` of the offending merge on `main`
(via PR) so the next deploy doesn't reintroduce it.

Source-first alternative: `git revert <merge-sha>` on a branch → PR → merge.
Note `scripts/vercel-ignore.sh`: a revert that only touches docs/tests/CI
files will NOT trigger a build — revert of real code always builds.

## 2. Feature-flag rollback (preferred for risky behavior)

Risky behavior ships dark behind a DB feature flag (see `audit-use-outbox`).
Rollback = flip the flag OFF in **admin → feature flags** — atomic across all
instances, no redeploy, reversible again at will. The
`FEATURE_FLAG_<NAME>` env var overrides the DB but needs a redeploy; prefer
the DB flag for incident response.

## 3. Migrations

Policy: **migrations are additive and deploy-safe** (enforced at review; they
run only on production deploys via `scripts/vercel-build.sh`). Prisma has no
down-migrations, so:

- **Roll forward**: write an inverse migration (drop the added column/table)
  as a new migration in a revert PR. Never edit or delete an applied
  migration file.
- **Schema/data corruption emergency**: restore the Postgres provider's
  point-in-time backup/snapshot, then redeploy the matching code version.
  MongoDB (audit logs) is append-only and survives a Postgres restore — the
  audit outbox re-drains idempotently (`outboxId` unique index), so replayed
  rows cannot duplicate.

## 4. Bad data mutations

- **Soft deletes**: every entity has `deletedAt` — restore by nulling it
  (the row is intact). There is no hard-delete path in normal operation.
- **Wrong field values**: the audit log stores `before`/`after` snapshots for
  every mutation (admin → audit log, filter by entity) — reconstruct the
  prior value from `before` and apply a corrective edit through the normal UI
  so the correction is itself audited.
- **Demo sessions**: disposable by design — reset via the demo admin action.

## 5. Jobs (pg-boss)

- Job **failed**: admin → jobs → retry (calls `boss.retry`; `resume` does NOT
  work on failed jobs in v12).
- Job wedged **active** (drain was killed mid-job): run the maintenance pass —
  `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <host>/api/cron/jobs`
  (it calls `boss.supervise()` first, which expires stuck jobs back to the
  queue), or wait for the daily cron.

## 6. Verify after any rollback

1. `/api/health` and `/api/ready` return OK.
2. Demo login → one mutation (e.g. edit a person) → it appears in the audit
   log within seconds (proves outbox + drain).
3. `/api/audit/verify` reports a valid hash chain.
4. Admin → jobs shows no unexpected `failed`/`active` accumulation.
