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

- 🟢⚡ CI pipeline monitoring & auto-fix — watching for failures, fixing build/lint/format issues [Claude 4, main]
- 🟢🧠 Employee profile pages — read-only `/employees/[id]` cards, guest-accessible [Claude 4, main]
- 🟡🧠 Org chart visualization — interactive hierarchy using existing manager/dept head data [Claude 2, main]
- 🟢⚡ Audit log TTL — add MongoDB TTL index for automatic 90-day retention [Claude 1, main]
- 🟢⚡ Rate limit table cleanup — prune expired RateLimit rows on a schedule [Claude 1, main]

## Recently Completed

- ✅ Server-side pagination — getPagedPersons/Teams/Departments, skip/take Prisma, URL params (?q=&page=), 400ms debounce, MUI Pagination, 1491 tests
- ✅ Standardize positions catalog — Position model, 2 actions, /positions page, Autocomplete, 18 locales, 15 tests
- ✅ Typed server action errors — ErrorCode type, ActionError class, all throws updated, 1490 tests passing

## Backlog

### Features

- 🟡🧠 Email notifications — Resend/SendGrid for leave approvals, review requests, role changes + preferences page
- 🟡🧠 Review aggregation dashboard — manager sees all reviews for their direct reports in one view
- 🟡🧠 Leave balance carryover / accrual — year-end carryover logic, expiry dates, accrual schedules
- 🟡🧠 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟢🧠 Cascade delete impact warnings — show what references break before deleting a person/team/department
- 🟢🧠 Bulk actions on tables — multi-select persons/teams and apply batch operations

### Code Quality / Architecture

### Testing

### Accessibility (WCAG)

### Security

- 🟡🧠 JWT permission revocation window — permissions valid up to 1h after admin revokes them
