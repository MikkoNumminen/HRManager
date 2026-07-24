#!/usr/bin/env bash
# Vercel ignoreCommand: skip deployment when only docs, tests, CI configs,
# or git hooks changed since the LAST DEPLOYED commit. Vercel interprets exit
# code 0 as "skip build" and exit code 1 as "proceed with build".
#
# We can't inline this in vercel.json because the `ignoreCommand` field
# has a 256-character limit and the exclusion list is long.
#
# IMPORTANT: compare against $VERCEL_GIT_PREVIOUS_SHA (the SHA of the last
# successfully built commit), not HEAD^. When a push contains multiple
# commits, Vercel only triggers a build for the head commit, so a
# `HEAD^ HEAD` diff would only see the LAST commit's changes — and a
# code+docs push that ends in a docs commit would incorrectly skip the
# code changes from the earlier commit.

set -euo pipefail

BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"

# Fallback chain: VERCEL_GIT_PREVIOUS_SHA -> HEAD^ -> deploy.
# - VERCEL_GIT_PREVIOUS_SHA is what Vercel sets in production. If unset
#   (first deploy, preview, or running locally), fall back to HEAD^.
# - If HEAD^ isn't reachable (shallow clone with depth 1), proceed with the
#   build — safer than skipping unintentionally.
if [ -z "$BASE" ] || ! git cat-file -e "$BASE" 2>/dev/null; then
  if git rev-parse HEAD^ >/dev/null 2>&1; then
    BASE="HEAD^"
    echo "[vercel-ignore] VERCEL_GIT_PREVIOUS_SHA unavailable, comparing against HEAD^"
  else
    echo "[vercel-ignore] no comparison base available, proceeding with build"
    exit 1
  fi
else
  echo "[vercel-ignore] comparing against last deployed commit $BASE"
fi

# Pathspecs that are safe to ignore for deployment purposes:
#  - any markdown file at any depth (docs, READMEs, audit notes)
#  - the docs/ directory
#  - all test trees (server tests, shared tests, feature __tests__, e2e)
#  - jest / playwright / stryker config files
#  - GitHub Actions workflows and git hooks
#  - the CI-only drift gates and the README table generator (never imported by
#    the app; scripts/vercel-*.sh is deliberately NOT excluded, since those DO
#    decide what a deployment does)
#  - k8s manifests and the Helm chart (a different deployment target entirely)
#  - dotfile metadata
if git diff --quiet "$BASE" HEAD -- \
  ':(exclude,glob)**/*.md' \
  ':(exclude)docs/**' \
  ':(exclude)src/tests/**' \
  ':(exclude,glob)src/**/__tests__/**' \
  ':(exclude)e2e/**' \
  ':(exclude)playwright.config.ts' \
  ':(exclude)stryker.config.mjs' \
  ':(exclude,glob)jest.config.*' \
  ':(exclude)jest.polyfills.ts' \
  ':(exclude)jest.setup.ts' \
  ':(exclude).github/**' \
  ':(exclude).husky/**' \
  ':(exclude,glob)scripts/check-*.mjs' \
  ':(exclude)scripts/generate-test-table.mjs' \
  ':(exclude)k8s/**' \
  ':(exclude).gitignore' \
  ':(exclude).prettierignore' \
  ':(exclude).editorconfig'; then
  echo "[vercel-ignore] only docs/tests/CI changed since $BASE, skipping build"
  exit 0
fi

echo "[vercel-ignore] code changes detected since $BASE, proceeding with build"
exit 1
