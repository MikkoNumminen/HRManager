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

- 🟢⚡ CI pipeline monitoring & auto-fix — watching for failures, fixing build/lint/format issues [Claude 4, main]

## Backlog

### Features

- 🟡🧠 Email notifications — Resend/SendGrid for leave approvals, review requests, role changes + preferences page
- 🟡🧠 Leave balance carryover / accrual — year-end carryover logic, expiry dates, accrual schedules
- 🟡🧠 Tutorial UX overhaul — no guiding effect on back button, lacks MUI visual guidance (highlighting/effects), guidance boxes appear in wrong positions
- 🟢🧠 Bulk actions on tables — multi-select persons/teams and apply batch operations
- 🟡⚡ Manager approval workflow & escalation — route leave requests to manager; auto-escalate to dept head after 5 days no response; send reminders
- 🟡⚡ Employee self-service portal — read-only employee view: own profile, team, manager, leave balance, reviews; GDPR-compliant
- 🟡⚡ Full-text search (cross-entity) — PostgreSQL tsvector across persons/teams/departments/reviews; ranked results; filters
- 🟡⚡ Document management — upload/store employee contracts, certs; PDF preview; virus scan; soft-delete
- 🟡⚡ Org chart drag-and-drop — drag person to new team/department; confirm + audit + DB write
- 🟡⚡ Onboarding/offboarding workflows — checklists per employee; assign tasks to managers; track completion

### Code Quality / Architecture (found by audit)

- 🟡🧠 OpenTelemetry tracing — instrument request → middleware → query → action → DB; export to Jaeger/Datadog; P95/P99 dashboards
- 🟡🧠 Background job queue (Bull/Bree) — async processing for emails, report generation, bulk imports; retry + dead-letter queue; admin job dashboard
- 🟡🧠 WebSocket / real-time updates — live person create, leave request notifications, activity feed via Socket.io
- 🟡🧠 Feature flags — LaunchDarkly or custom; enable per-user or env; track flag changes in audit log
- 🟢⚡ Error tracking (Sentry) — capture unhandled exceptions, server action failures, client errors; grouping + alerts
- 🔴🧠 Advanced reporting & analytics — turnover rates, headcount trends, leave utilization by dept, review completion; filtered exports; charts
- 🔴🧠 Data encryption at rest — application-level encryption on sensitive fields; versioned key IDs; key rotation without downtime
- 🔴🧠 GDPR right-to-deletion policy — anonymize personal data after 7yr, retain audit logs 10yr, soft-delete recovery 30d, user self-service data export
- 🟡🧠 Database migration rollback — document + test Prisma rollback; test restore-from-backup procedure
- 🟡🧠 Performance at scale — load test with 10k/100k employees; identify N+1 queries, missing indexes; document scaling cliffs

### Testing (found by audit)

- 🟡⚡ Visual regression testing — Percy/Chromatic; snapshot all components in all 6 themes; diff on PRs
- 🟡🧠 Load & performance benchmarks (k6) — 100 concurrent users; performance budgets (dashboard < 2s, mutations < 500ms); CI fails if exceeded
- 🟡⚡ Mutation testing (Stryker) — mutate code; verify tests catch mutations; target > 80% mutation score

### Accessibility (WCAG)

_(none remaining)_

### Security (found by audit)

- 🔴🧠 JWT callback demoSessionId ownership validation — trusts token.demoSessionId without verifying it belongs to the authenticated user (src/auth.ts:103-105)
- 🟡🧠 Two-Factor Authentication (TOTP) — QR code setup, 6-digit codes, recovery codes, audit all 2FA events; SOC 2 requirement
- 🟡🧠 Session management & concurrent limits — track sessions per device; force-logout on limit exceeded; "Sign out all other sessions" button

### DevOps & Infrastructure

- 🟡⚡ Kubernetes manifests & Helm charts — Deployment, Service, Ingress, ConfigMap, Secret; resource limits + readiness probes
- 🟡⚡ Blue-green deployment strategy — two production environments; switch traffic via LB; zero-downtime upgrades + instant rollback
- 🟢⚡ Staging environment parity — staging with anonymized production data; deploy-to-staging + E2E before prod
