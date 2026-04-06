#!/usr/bin/env bash
# Vercel ignoreCommand: skip deployment when only docs, tests, CI configs,
# or git hooks changed since the previous commit. Vercel interprets exit
# code 0 as "skip build" and exit code 1 as "proceed with build".
#
# We can't inline this in vercel.json because the `ignoreCommand` field
# has a 256-character limit and the exclusion list is long.

set -euo pipefail

# Vercel uses a shallow clone — make sure HEAD^ is reachable. If not, fall
# back to deploying (safer than skipping unintentionally).
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "[vercel-ignore] HEAD^ not available, proceeding with build"
  exit 1
fi

# Pathspecs that are safe to ignore for deployment purposes:
#  - any markdown file at any depth (docs, READMEs, audit notes)
#  - the docs/ directory
#  - all test trees (server tests, shared tests, feature __tests__, e2e)
#  - jest / playwright / stryker config files
#  - GitHub Actions workflows and git hooks
#  - dotfile metadata
if git diff --quiet HEAD^ HEAD -- \
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
  ':(exclude).gitignore' \
  ':(exclude).prettierignore' \
  ':(exclude).editorconfig'; then
  echo "[vercel-ignore] only docs/tests/CI changed since HEAD^, skipping build"
  exit 0
fi

echo "[vercel-ignore] code changes detected, proceeding with build"
exit 1
