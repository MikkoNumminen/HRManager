#!/usr/bin/env bash
# Vercel build command. Applies database migrations ONLY for production
# deployments, then generates the Prisma client and builds Next.js.
#
# Why gate migrations: `prisma migrate deploy` previously ran on EVERY build,
# including preview deployments. On the Vercel Hobby tier all environments share
# a single DATABASE_URL, so a destructive migration on an unreviewed feature
# branch would hit the production database the moment a preview built — before
# the PR was ever reviewed. Migrations are therefore applied only when
# VERCEL_ENV=production.
#
# Local and CI builds (VERCEL unset) still migrate, so `npm run build` behaves as
# before. If a preview environment ever gets its OWN database, set
# RUN_MIGRATIONS=true on that environment to opt back in.

set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ] || [ -z "${VERCEL:-}" ] || [ "${RUN_MIGRATIONS:-}" = "true" ]; then
  echo "[vercel-build] applying migrations (VERCEL_ENV=${VERCEL_ENV:-unset})"
  prisma migrate deploy
else
  echo "[vercel-build] skipping migrations on '${VERCEL_ENV:-unknown}' deployment (set RUN_MIGRATIONS=true to override)"
fi

prisma generate
next build
