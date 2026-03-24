# TODO

Shared task list across all Claude Code sessions. Remove completed tasks immediately — no "Recently Completed" section.
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

> 📋 **Audit research:** All items below marked "(found by audit)" have detailed file:line references in `AUDIT_REPORT.md`. Read it before starting any of these tasks.

- 🟢⚡ CI pipeline monitoring & auto-fix — watching for failures, fixing build/lint/format issues [Claude 4, main]
- 🔴🧠 Split `serverActions.ts` into domain modules — barrel re-export for backward compat [Claude 3, split-server-actions]

## Backlog

### Features

- 🟡🧠 Email notifications — Resend/SendGrid for leave approvals, review requests, role changes + preferences page
- 🟡🧠 Review aggregation dashboard — manager sees all reviews for their direct reports in one view
- 🟡🧠 Leave balance carryover / accrual — year-end carryover logic, expiry dates, accrual schedules
- 🟡🧠 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟢🧠 Bulk actions on tables — multi-select persons/teams and apply batch operations

### Code Quality / Architecture (found by audit)

- 🔴🧠 Split `serverActions.ts` into domain modules — god file at 2,861 lines; split into serverActions.person/team/dept/admin/leave/reviews/data/positions.ts
- 🟡🧠 Split `queries.ts` into domain modules — 1,073 lines; same domain split pattern as serverActions
- 🟡🧠 Implement permission middleware for queries — inconsistent auth guards across query functions; some check permissions, others rely on caller
- 🟡🧠 Consolidate duplicate seed data — demoSession.ts (9 persons) and serverActions.ts (6 persons) diverged; extract shared seed definitions to seedData.ts
- 🟢⚡ Extract `DEMO_EMAIL` constant — serverActions/admin.ts:488 still has hardcoded string (needs update after serverActions split lands)

### Testing (found by audit)

- 🟡🧠 Add tests for MyReviewsClient component — no direct tests; only covered indirectly
- 🟢⚡ Fix test file naming inconsistencies — PersonCheckBoxList.test.tsx → PersonCheckboxList, PersonTable → PersonsTable, RemovePeople → RemovePerson
- 🟢⚡ Add permission-denied path tests for queries — hasPermission always mocked to true in queries.test.ts; denial branch never exercised

### Accessibility (WCAG)

### Security (found by audit)

- 🟡🧠 JWT permission revocation window — permissions valid up to 1h after admin revokes them
- 🟡🧠 Add permission check to `getReviewRequestWithTemplate` — queries.ts:723 allows any authenticated user with a UUID to retrieve another user's review assignment
- 🟡🧠 Add consistent permission checks to read queries — getPersons, getTeams, getDepartments, getReviewTemplates, getReviewCycles lack explicit auth guards
- 🟢⚡ Domain-restrict profile image URLs — updateProfileImage accepts any HTTPS URL; restrict to known CDNs or an allowlist (serverActions.ts:1513)
