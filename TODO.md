# TODO

Shared task list across all Claude Code sessions. After completing a task, note how long it took before removing it.
Every item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large.
In Progress items must show the owner: `[Claude 1, main]`, `[Claude 2, worktree-name]`, etc.
4 permanent Claude instances: **Claude 1, Claude 2, Claude 3, Claude 4.**

**⚠️ RULE: NEVER start working on a task without FIRST moving it to "In Progress" with your name tag. Re-read this file BEFORE starting any work. If a task already has an owner tag, DO NOT work on it — pick something else or wait.**

## In Progress

> 📋 **Audit research:** Items marked "(found by audit)" have detailed file:line references in memory file `project_audit_findings.md`. Read it before starting any of these tasks.

## Recently Completed

- ✅ Fix all lint warnings — 137 no-node-access + 22 no-unnecessary-act + 1 prefer-to-have-value → zero lint issues
- ✅ MongoDB docs — README, CLAUDE.md, architecture.md all have comprehensive polyglot persistence docs
- ✅ Fix lint errors + warnings — 3 errors, 31 warnings resolved
- ✅ MongoDB graceful degradation — app works without MongoDB configured

## Backlog

### Features

- 🟢 Global search & filtering on person/team/department tables — no search UI exists
- 🟢 Employee profile pages — read-only `/employees/[id]` cards, guest-accessible
- 🟡 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟡 Loading skeletons with Suspense boundaries — no loading states on any pages
- 🟡 Org chart visualization — interactive hierarchy using existing manager/dept head data
- 🟡 Bulk actions on tables — multi-select persons/teams and apply batch operations
- 🟡 Empty state polish — illustrations and CTAs when tables are empty
- 🔴 Leave/absence management — leave types, requests, balances, approval workflows
- 🔴 Performance reviews / 360 feedback — review templates, rating scales, feedback cycles

### Code Quality / Architecture

- 🟡 Server-side pagination — all queries load entire result sets; add skip/take to Prisma queries
- 🟡 Typed server action errors — replace generic string errors with typed error codes (PERMISSION_DENIED, VALIDATION_ERROR, etc.)
- 🟡 Translate server action error messages — errors hardcoded in English, bypass i18n
- 🟡 Memoize expensive components — AuditLogViewer (20KB) and DashboardCharts re-render unnecessarily
- 🟡 Standardize positions catalog — free-text position field causes inconsistency ("Engineer" vs "Software Engineer")

### Testing

- 🟢 CSV import edge case tests — BOM, non-UTF-8, embedded newlines, empty files
- 🟢 Rate limit boundary/race condition tests — exact boundary, concurrent requests, window expiry
- 🟡 Dashboard raw SQL query tests — `getDashboardMetrics()` CTEs/window functions untested
- 🟡 Deferred audit logging edge case tests — write failures, permission denial logging, rate limit hit logging
- 🔴 Playwright E2E test suite — auth flows, CRUD, permissions, import/export, themes, locales

### Accessibility (WCAG)

- 🟢 Add `aria-expanded` to collapsible elements — AuditLogViewer filters, mobile nav
- 🟢 Add `aria-sort` to sorted table columns — screen readers can't detect sort state
- 🟢 Link form errors via `aria-describedby` — errors shown as text but not associated with inputs

### Security

- 🟢 Rate limit IP spoofing protection — trusts `x-forwarded-for` without proxy validation
- 🟢 Demo session cleanup failure logging — silent failures leave stale data
- 🟡 JWT permission revocation window — permissions valid up to 1h after admin revokes them

