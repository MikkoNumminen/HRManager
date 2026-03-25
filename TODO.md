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

> 📋 **Audit research:** All items below marked "(found by audit)" have detailed file:line references in `AUDIT_REPORT.md` and `AUDIT_RESULTS.md`. Read before starting any audit-tagged task.

- 🟢⚡ CI pipeline monitoring & auto-fix [Claude 4, main]
- 🟡⚡ Modularization Phase 1 — split schemas.ts into per-feature schema files [neekeri, main]

## Backlog

### Modularization (see memory: project_modularization_plan.md)

- 🔴🧠 Modularization Phase 2 — move 80 flat components to feature dirs
- 🔴⚡ Modularization Phase 3 — co-locate tests + shared mock helper
- 🟡⚡ Modularization Phase 4 — split 5 mega components (>400 lines each)
- 🟢⚡ Modularization Phase 5 — split large action files (>300 lines)


### Features

- 🟡🧠 Email notifications — Resend/SendGrid for leave approvals, review requests, role changes + preferences page
- 🟡🧠 Leave balance carryover / accrual — year-end carryover logic, expiry dates, accrual schedules
- 🟡🧠 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟢🧠 Bulk actions on tables — multi-select persons/teams and apply batch operations
- 🟡⚡ Manager approval workflow & escalation — route leave requests to manager; auto-escalate to dept head after 5 days no response; send reminders
- 🟡⚡ Full-text search (cross-entity) — PostgreSQL tsvector across persons/teams/departments/reviews; ranked results; filters
- 🟡⚡ Document management — upload/store employee contracts, certs; PDF preview; virus scan; soft-delete
- 🟡⚡ Org chart drag-and-drop — drag person to new team/department; confirm + audit + DB write
- 🟡⚡ Onboarding/offboarding workflows — checklists per employee; assign tasks to managers; track completion
- 🟡🧠 Fun demo seed data — use a recognizable fictional org structure (e.g. WoW factions/guilds) for demo org chart instead of generic names
- 🟡⚡ User-specified themes with DB persistence — add `theme` field to User model; persist via JWT (Option A); org-wide admin default theme setting; sync localStorage ↔ DB on login/change; update FOUC script; tests + i18n

### Code Quality / Architecture (found by audit)

- 🟢⚡ DRY-02 remaining: apply useFormAction hook to remaining ~16 form components not yet converted (REVIEW.md DRY-02)
- 🟡🧠 WebSocket / real-time updates — live person create, leave request notifications, activity feed via Socket.io
- 🔴🧠 Data encryption at rest — application-level encryption on sensitive fields; versioned key IDs; key rotation without downtime
- 🔴🧠 GDPR right-to-deletion policy — anonymize personal data after 7yr, retain audit logs 10yr, soft-delete recovery 30d, user self-service data export
- 🟡🧠 Database migration rollback — document + test Prisma rollback; test restore-from-backup procedure
- 🟡🧠 Performance at scale — load test with 10k/100k employees; identify N+1 queries, missing indexes; document scaling cliffs

### Testing (found by audit)

- 🟡⚡ Test coverage scan — run coverage report, identify all files/branches below 100%, write missing tests until 100% line+branch coverage
- 🔴⚡ Storybook + Chromatic visual regression — install @storybook/react + @storybook/nextjs + chromatic; write stories for all ~80 components (key prop variations); set up Chromatic project + GitHub secret; add CI workflow; snapshot all 6 themes × all components as baselines; diff on PRs
- 🟡🧠 Load & performance benchmarks (k6) — 100 concurrent users; performance budgets (dashboard < 2s, mutations < 500ms); CI fails if exceeded
- 🟡⚡ Mutation testing (Stryker) — mutate code; verify tests catch mutations; target > 80% mutation score
- 🔴🧠 E2E test suite — Playwright setup, auth helpers, DB seeding, tests for all ~15 routes; ~4-6 hours to write, ~5-15 min runtime

### Accessibility (WCAG)

_(none remaining)_

### Security (found by audit)

- 🟡⚡ SEC-02: pin next-auth to stable release — currently on beta.30 in production (REVIEW.md SEC-02)

### DevOps & Infrastructure

- 🟡⚡ Blue-green deployment strategy — two production environments; switch traffic via LB; zero-downtime upgrades + instant rollback
- 🟢⚡ Staging environment parity — staging with anonymized production data; deploy-to-staging + E2E before prod
