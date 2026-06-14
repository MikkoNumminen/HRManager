#!/usr/bin/env bash
# One-command local bootstrap: dependencies → env files → test/dev Postgres (Docker)
# → schema → ready. Idempotent and safe to re-run. Starts both Postgres and
# MongoDB (the dev app uses real Mongo; tests use an in-memory Mongo).
#
#   ./scripts/setup.sh        # full setup
#
# Prereqs: Node (see .nvmrc), Docker. After it finishes: `npm run dev` or `npm run test:all`.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies (npm ci)"
npm ci

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from template — set AUTH_SECRET with:  npx auth secret"
fi
if [ ! -f .env.test ]; then
  cp .env.test.example .env.test
  echo "==> Created .env.test from template"
fi

echo "==> Starting Postgres + MongoDB (docker compose up -d db mongo)"
docker compose up -d db mongo

echo "==> Waiting for Postgres to accept connections"
until docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

# Create the dev + test databases (no-op if they already exist).
docker compose exec -T db createdb -U postgres hrmanager 2>/dev/null || true
docker compose exec -T db createdb -U postgres hrmanager_test 2>/dev/null || true

# Apply the committed migrations headlessly — same seam as the deploy path
# (scripts/vercel-build.sh), not the interactive `migrate dev`.
echo "==> Applying committed migrations to the dev database (prisma migrate deploy)"
npx prisma migrate deploy

echo ""
echo "==> Done. Next:"
echo "    npm run dev        # http://localhost:3000"
echo "    npm run test:all   # full suite against the test DB"
