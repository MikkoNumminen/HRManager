# TODO

Shared task list across all Claude Code sessions. After completing a task, note how long it took before removing it.
Every item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large.
In Progress items must show the owner: `[worktree-name]` or `[main]`.

**NOTE:** 3 Claude instances run in parallel. Always re-read TODO.md before presenting tasks. Maintain this list carefully — other Claudes depend on it.

**⚠️ RULE: NEVER start working on a task without FIRST moving it to "In Progress" with your `[worktree-name]` or `[main]` tag. Re-read this file BEFORE starting any work. If a task already has an owner tag, DO NOT work on it — pick something else or wait.**

## In Progress

> 📋 **Audit research:** Items marked "(found by audit)" have detailed file:line references in memory file `project_audit_findings.md`. Read it before starting any of these tasks.

- 🟡 MongoDB docs — update README.md, CLAUDE.md, architecture.md for polyglot persistence `[main, Mohammed]`
- 🟢 Fix lint errors + warnings — unused vars, test best practices `[dashboard]`

## Recently Completed

- ✅ README screenshots with different themes (merged)
- ✅ MongoDB graceful degradation — app works without MongoDB configured
- ✅ Demo login default — enabled by default (opt-out instead of opt-in)

## Backlog

- 🟡 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟢 Fix remaining lint warnings — ~100 `testing-library/no-node-access` warnings across test files
