# TODO

Shared task list across all Claude Code sessions. After completing a task, note how long it took before removing it.
Every item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large. LLM marker: ⚡ Sonnet, 🧠 Opus.
In Progress items must show the owner: `[Claude 1, main]`, `[Claude 2, worktree-name]`, etc.
4 permanent Claude instances: **Claude 1, Claude 2, Claude 3, Claude 4.**

**🚨 MANDATORY RULES — NO EXCEPTIONS:**

1. **Re-read this file BEFORE starting ANY work** — every single session, every single task.
2. **NEVER start a task without FIRST moving it to "In Progress" with your name tag.** If you skip this, you are causing collisions.
3. **If you pause or stop mid-task, your entry MUST stay in "In Progress" until the work is committed and pushed.** Do not remove it just because you stopped — other Claudes need to see it.
4. **If a task already has an owner tag, do NOT touch it.** Pick something else or wait.
5. **Violating these rules breaks the shared workflow for all instances.**

## In Progress

> 📋 **Audit research:** Items marked "(found by audit)" have detailed file:line references in memory file `project_audit_findings.md`. Read it before starting any of these tasks.

## Recently Completed

- ✅ Playwright E2E test suite — 7 new spec files, 75 total tests (was 34): dashboard, profile, data I/O, detail editing, validation, full workflow
- ✅ Translate server action errors — 48-key errors namespace, 18 locales, next-intl/server mock for tests
- ✅ Memoize expensive components — React.memo on AuditLogViewer + DashboardCharts, useCallback on helpers
- ✅ Rate limit IP spoofing protection — x-forwarded-for proxy validation
- ✅ WCAG accessibility — aria-expanded (AuditLogViewer, TopBar), aria-sort (Timestamp col), aria-describedby (5 forms)

## Backlog

### Features

- 🟢🧠 Global search & filtering on person/team/department tables — no search UI exists
- 🟢🧠 Employee profile pages — read-only `/employees/[id]` cards, guest-accessible
- 🟡🧠 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟡⚡ Loading skeletons with Suspense boundaries — no loading states on any pages
- 🟡🧠 Org chart visualization — interactive hierarchy using existing manager/dept head data
- 🟡🧠 Bulk actions on tables — multi-select persons/teams and apply batch operations
- 🟡⚡ Empty state polish — illustrations and CTAs when tables are empty
- 🔴🧠 Leave/absence management — leave types, requests, balances, approval workflows
- 🔴🧠 Performance reviews / 360 feedback — review templates, rating scales, feedback cycles

### Code Quality / Architecture

- 🟡🧠 Server-side pagination — all queries load entire result sets; add skip/take to Prisma queries
- 🟡🧠 Typed server action errors — replace generic string errors with typed error codes (PERMISSION_DENIED, VALIDATION_ERROR, etc.)

- 🟡🧠 Standardize positions catalog — free-text position field causes inconsistency ("Engineer" vs "Software Engineer")

### Testing

### Accessibility (WCAG)

### Security

- 🟢⚡ Demo session cleanup failure logging — silent failures leave stale data
- 🟡🧠 JWT permission revocation window — permissions valid up to 1h after admin revokes them
