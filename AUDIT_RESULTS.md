# HRManager — Full Codebase Audit Results

**Date:** 2026-03-24
**Scope:** README accuracy · Security deep scan · Roadmap expansion
**Method:** Read-only analysis across 250+ source files

---

## Phase 1: README Accuracy Audit

### ✅ VERIFIED

| Claim                                            | Evidence                                                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16                                       | package.json: `"next": "^16.2.1"`                                                                                                                  |
| React 19                                         | package.json: `"react": "^19.2.4"`                                                                                                                 |
| TypeScript 5.9                                   | package.json: `"typescript": "^5.9.3"`                                                                                                             |
| MUI v7                                           | package.json: `"@mui/material": "^7.3.9"`                                                                                                          |
| Prisma 7                                         | package.json: `"@prisma/client": "^7.5.0"`                                                                                                         |
| MongoDB 8                                        | docker-compose.yml: `image: mongo:8`                                                                                                               |
| MongoDB driver 7                                 | package.json: `"mongodb": "^7.1.0"`                                                                                                                |
| Zod 4                                            | package.json: `"zod": "^4.3.6"`                                                                                                                    |
| Jest 30                                          | package.json: `"jest": "^30.3.0"`                                                                                                                  |
| NextAuth v5 (beta)                               | package.json: `"next-auth": "5.0.0-beta.30"`                                                                                                       |
| 34 permissions                                   | `PERMISSION_KEYS` in src/permissions.ts — exactly 34 keys                                                                                          |
| 18 languages                                     | messages/ directory — 18 JSON files (en, ar, de, es, fi, fr, hi, ja, ko, pl, pt, ru, sv, sw, th, tr, uk, zh)                                       |
| 6 visual themes                                  | `THEME_NAMES` in src/themeConfig.ts — dark, light, cyberpunk, retro, bubblegum, ocean                                                              |
| 91.9% line coverage                              | Coverage report: Lines 91.91%                                                                                                                      |
| 83.5% function coverage                          | Coverage report: Functions 83.50%                                                                                                                  |
| Sliding-window rate limiting                     | src/rateLimit.ts:46-77 — `windowStart` + `RATE_LIMIT_WINDOW_MS` comparison                                                                         |
| MongoDB TTL index on createdAt                   | src/mongoDb.ts — `col.createIndex({ createdAt: 1 }, { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS })`                                                |
| `after()` deferred audit logging                 | src/auditLog.ts — `import { after } from "next/server"` used at lines 88, 125, 153                                                                 |
| Atomic INSERT…ON CONFLICT for rate limiting      | src/rateLimit.ts:57-70 — raw SQL with `ON CONFLICT (identifier, action) DO UPDATE`                                                                 |
| `useOptimistic` for instant create feedback      | 6 imports found across component files                                                                                                             |
| RFC 4180 CSV parsing                             | src/csvUtils.ts:17 — comment "RFC 4180 CSV parser"                                                                                                 |
| Zero external CSV dependencies                   | No CSV library in package.json; custom parser in csvUtils.ts                                                                                       |
| `permissionsVersion` detects stale permissions   | src/auth.ts:107-172 — full version-check logic                                                                                                     |
| 5 parallel PostgreSQL queries for dashboard      | src/features/dashboard/queries.ts:44 — `Promise.all()` with 5 queries including CTEs                                                               |
| FOUC prevention / CSS variables before hydration | src/themeConfig.ts + proxy.ts — nonce injection and theme CSS variables                                                                            |
| `useActionState` for forms                       | Used across component structure                                                                                                                    |
| Soft deletes (`deletedAt`)                       | prisma/schema.prisma — Person, Team, Department, etc. all have `deletedAt` fields                                                                  |
| PostgreSQL + MongoDB both actively used          | docker-compose.yml confirms both; audit logs go to MongoDB, all other data to PostgreSQL                                                           |
| All routes exist                                 | /dashboard, /admin, /managePersons, /manageTeams, /manageDepartments, /reviews, /leave, /positions, /employees, /orgchart all verified in src/app/ |
| Docker setup works as described                  | docker-compose.yml includes health checks, auto-migration, both databases                                                                          |

### ❌ INCORRECT

| Claim                             | Actual                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| "1640 tests" (line 147, line 244) | **1671 tests** (91 suites, verified from test runner output) — 31 more than stated |

### ⚠️ AMBIGUOUS / NEEDS CLARIFICATION

| Claim                                                 | Issue                                                                                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "All 52 components" (test table row)                  | src/components/ contains **64 .tsx files** — "52" may refer to feature/UI components only, excluding utility wrappers (ThemeRegistry, SessionProvider, SnackbarProvider etc.) — clarify count or update |
| "all 48 UI components" (testing philosophy paragraph) | Inconsistent with "52 components" in same section — should be unified                                                                                                                                   |
| "Partial unique indexes (WHERE deletedAt IS NULL)"    | Not visible in prisma/schema.prisma — regular `@@unique` and `@@index` constraints found; partial indexes may exist in raw migrations — verify                                                          |
| "75 Playwright E2E tests" (line 147)                  | Table row shows 75 for E2E; actual .spec.ts files in e2e/ = 14 files (test count within those files may be 75 — check)                                                                                  |

---

## Phase 2: Security Deep Scan

Severity scale: 🔴 CRITICAL · 🟠 HIGH · 🟡 MEDIUM · 🔵 LOW · ℹ️ INFORMATIONAL

---

### 🔴 CRITICAL

**[C1] src/auth.ts — Demo user role forced to `superuser` on every login**

- **Description:** The demo login `authorize()` callback upserts the demo user with `role: "superuser"` on every single login, overwriting any admin-applied role changes.
- **Exploit:** Admin downgrades demo user → user re-logs in → instantly becomes superuser again. Repeatable indefinitely, bypassing all role restrictions.
- **Fix:** On first demo login, set role in DB and never override it again; remove blanket `role: "superuser"` from upsert.

**[C2] src/auth.ts:103-105 — JWT callback trusts `demoSessionId` without ownership validation**

- **Description:** The JWT callback reads `token.demoSessionId` and uses it directly without verifying that it belongs to the authenticated user.
- **Exploit:** Attacker manipulates their JWT (if they can get a raw token) to claim a different `demoSessionId`, hijacking another user's demo session and all their isolated data.
- **Fix:** In JWT callback, query `DemoSession.findUnique({ where: { id: demoSessionId, userId: user.id } })` and reject if mismatch.

**[C3] src/auth.ts:71-94 — First-user superuser bootstrap has a race window**

- **Description:** Uses `Serializable` isolation to prevent duplicate superusers, but the logic is fragile — both concurrent users see `userCount === 0` and both may commit as superuser before the serializable conflict rolls one back.
- **Mitigation present:** Serializable isolation DOES prevent this in theory. However, the safer approach is a unique constraint on `role = 'superuser'` or a separate enrollment gate.
- **Fix:** Add a database-level unique partial index: `CREATE UNIQUE INDEX ON "User" (role) WHERE role = 'superuser'`

---

### 🟠 HIGH

**[H1] src/features/dashboard/queries.ts:46-102 — Raw SQL with template literals (architectural risk)**

- **Description:** Uses `prisma.$queryRaw` with template literal interpolation. Currently parameterized via Prisma's tagged template system, but the pattern is fragile — any future developer adding a user-controlled variable could introduce SQL injection.
- **Current severity:** 🟡 MEDIUM (currently safe), but 🟠 HIGH architectural risk.
- **Fix:** Switch to Prisma's ORM methods or use `Prisma.sql` named parameters exclusively.

**[H2] src/features/admin/actions.ts — Mock user seeding not gated by environment**

- **Description:** `seedMockData()` seeds users like `admin@example.com`, `user1@example.com` into the global User table when not in demo mode. If someone controls one of those email addresses, they can log in via OAuth and inherit the seeded role/permissions.
- **Fix:** Wrap `seedMockData()` with `if (process.env.NODE_ENV !== 'production')` check.

**[H3] src/rateLimit.ts:17-43 — IP spoofing bypass via X-Forwarded-For**

- **Description:** Rate limiter falls back to `x-forwarded-for` and `x-real-ip` headers. In non-Vercel environments these headers can be forged — attacker gets 10 auth attempts per fake IP × infinite IPs.
- **Current mitigation:** Vercel deployments use `x-vercel-forwarded-for` which is trusted, so production Vercel is protected.
- **Fix:** For non-Vercel deployments, document that the reverse proxy must strip/validate forwarded-for headers before they reach the app.

**[H4] src/features/data/actions.ts — CSV formula injection**

- **Description:** Imported CSV values are not sanitized for spreadsheet formula prefixes (`=`, `+`, `-`, `@`). Exported data containing these values executes as formulas when opened in Excel/Google Sheets.
- **Fix:** In `parseCSV()` or import validation, strip or quote-escape values starting with `=`, `+`, `-`, `@`.

---

### 🟡 MEDIUM

**[M1] src/features/audit/queries.ts:26 — NoSQL injection via `userEmail` regex**

- **Description:** Audit log filter passes `userEmail` directly into a MongoDB `$regex` query without escaping. Attacker can search `.*` to match all emails, or `admin.*` to enumerate admin addresses.
- **Fix:** Escape regex metacharacters: `userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`

**[M2] src/app/api/cron/cleanup/route.ts — Timing attack on CRON_SECRET**

- **Description:** Auth check uses `===` string comparison, vulnerable to timing oracle. Attacker can brute-force CRON_SECRET one byte at a time by measuring response latency.
- **Fix:** `crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(\`Bearer \${secret}\`))`

**[M3] src/auditLog.ts — Base64 encoding used instead of hashing for IP privacy**

- **Description:** Rate-limit identifiers are "obfuscated" with base64 then truncated — this is reversible encoding, not hashing.
- **Fix:** `crypto.createHash('sha256').update(identifier).digest('base64').slice(0, 12)`

**[M4] src/demoSession.ts — MongoDB + PostgreSQL cleanup is non-atomic**

- **Description:** MongoDB audit log deletion runs separately from PostgreSQL session deletion. If PostgreSQL delete fails, MongoDB data is already gone — orphaned sessions with no audit trail.
- **Fix:** Use compensating transactions: if PostgreSQL delete fails, re-insert the MongoDB documents (or delete MongoDB last).

**[M5] src/actionErrors.ts — Error codes reveal permission/user structure**

- **Description:** Returning specific error codes like `permissionDenied`, `userNotFound`, `emailAlreadyExists` to clients enables enumeration of users and permission structure.
- **Impact:** Low direct harm, but enables targeted attacks.
- **Fix:** Generic error messages for unauthenticated users; detailed codes only for authenticated admin contexts.

---

### 🔵 LOW / ℹ️ INFORMATIONAL

**[L1] src/mongoDb.ts — MongoDB availability check is existence-only, not connectivity**

- `isMongoAvailable()` checks `!!process.env.MONGODB_URL` — doesn't verify actual connection. Audit logs silently fail if MongoDB is unreachable.
- **Fix:** Health-check endpoint that actually tests MongoDB connectivity.

**[L2] docker-compose.yml — Hardcoded dev credentials**

- `postgresql://postgres:postgres@db:5432/hrmanager` — acceptable for dev, dangerous if accidentally used as production template.
- **Fix:** Use `.env.docker` (gitignored) for credentials.

**[I1] src/constants.ts — Rate limit values hardcoded, not configurable**

- `MAX_REQUESTS_PER_WINDOW = 30`, `AUTH_MAX_REQUESTS = 10` cannot be tuned without code changes.
- **Recommendation:** Extract to env vars: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_AUTH_MAX`.

**[I2] CSP nonce implementation — Correct but `unsafe-inline` present as fallback**

- Nonce is properly per-request. `style-src 'unsafe-inline'` fallback weakens CSP for older browsers.
- **Recommendation:** Remove `unsafe-inline` fallback in production once browser support allows.

---

### Summary

| Severity    | Count |
| ----------- | ----- |
| 🔴 CRITICAL | 3     |
| 🟠 HIGH     | 4     |
| 🟡 MEDIUM   | 5     |
| 🔵 LOW / ℹ️ | 4     |

---

## Phase 3: Roadmap Expansion

Items are net-new — no duplicates with existing backlog. Organized by category with complexity, priority, and LLM marker.

---

### Security & Compliance

| Title                                       | What                                                                                                                                  | Why                                                                                | Complexity | Priority | LLM | Size |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Two-Factor Authentication (TOTP)            | TOTP with QR code setup, 6-digit codes, recovery codes, audit all 2FA events                                                          | SOC 2 requirement; shows cryptographic token generation and time-window validation | M          | P1       | 🧠  | 🟡   |
| Session management & concurrent limits      | Track sessions per device, force-logout on limit exceeded, "Sign out all other sessions" button                                       | Prevents credential sharing; shows stateless JWT tradeoffs                         | M          | P1       | 🧠  | 🟡   |
| IP allowlisting for admin functions         | Restrict superuser/admin actions to configured IP ranges                                                                              | Security-in-depth; shows understanding of proxy header handling                    | S          | P2       | ⚡  | 🟢   |
| Audit log tamper detection (hash chain)     | HMAC-SHA256 hash chain — each log entry links to previous hash, verification endpoint detects broken links                            | Legal evidence integrity; demonstrates cryptographic design thinking               | M          | P2       | 🧠  | 🟡   |
| Data encryption at rest (application-level) | Encrypt sensitive fields with libsodium/TweetNaCl, versioned key IDs, key rotation without downtime                                   | GDPR/HIPAA requirement; shows per-field encryption vs database-level tradeoffs     | L          | P2       | 🧠  | 🔴   |
| GDPR right-to-deletion vs retention policy  | Anonymize personal data after 7 years, retain audit logs 10 years, soft-delete recovery within 30 days, user self-service data export | European compliance; shows competing requirements thinking                         | L          | P2       | 🧠  | 🔴   |
| Password policy for non-OAuth users         | min-12 chars, complexity rules, HIBP check, rate-limited reset flow                                                                   | If credentials provider ever enabled, this is the security gate                    | S          | P3       | ⚡  | 🟢   |

---

### Data & Persistence

| Title                                | What                                                                                                                 | Why                                                                                | Complexity | Priority | LLM | Size |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Performance at scale — benchmarks    | Load test with 10k/100k employees; measure dashboard, pagination, org chart; identify N+1 queries, missing indexes   | Separates hobby projects from production systems; empirical performance data       | L          | P1       | 🧠  | 🔴   |
| Advanced reporting & analytics       | Turnover rates, headcount trends, leave utilization by type/dept, review completion rates — filtered exports, charts | Real HR departments live in dashboards; shows complex query + aggregation thinking | L          | P1       | 🧠  | 🔴   |
| Database migration rollback strategy | Document + test Prisma migration rollback; test restore-from-backup procedure                                        | Migrations fail; a tested rollback plan prevents panic and data loss               | M          | P1       | ⚡  | 🟡   |
| GDPR data migration tooling          | Admin UI for bulk CSV import with field mapping, dry-run preview, rollback from audit snapshot                       | Real HR systems need data migration; shows ETL and data integrity thinking         | M          | P2       | 🧠  | 🟡   |

---

### Features

| Title                                  | What                                                                                              | Why                                                                 | Complexity | Priority | LLM | Size |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Manager approval workflow & escalation | Route leave requests to manager; auto-escalate to dept head after 5 days; reminders               | Real HR approval chains; shows stateful workflow design             | M          | P1       | ⚡  | 🟡   |
| Employee self-service portal           | Read-only employee view: own profile, team, manager, leave balance, reviews — GDPR-compliant      | Real HR need; shows data minimization and access control design     | M          | P2       | ⚡  | 🟡   |
| Full-text search (cross-entity)        | PostgreSQL `tsvector` search across persons, teams, departments, reviews; ranked results; filters | Large datasets need good search; shows PostgreSQL FTS               | M          | P2       | ⚡  | 🟡   |
| Document management                    | Upload/store employee documents (contracts, certs, ID); preview PDF; virus scan; soft-delete      | Real HR document storage; shows file handling and data organization | M          | P2       | ⚡  | 🟡   |
| Org chart drag-and-drop reorganization | Drag person to new team/department in org chart; confirm + audit log + DB update                  | Complex interactive feature; shows ReactFlow mutation handling      | M          | P2       | ⚡  | 🟡   |
| Onboarding/offboarding workflows       | Checklists per employee; assign tasks to managers; send reminders; track completion               | Shows workflow design and task state management                     | M          | P3       | ⚡  | 🟡   |
| Calendar integration (iCal for leave)  | Generate .ics files for approved leave; team calendar export                                      | Shows external format integration; quality-of-life feature          | S          | P3       | ⚡  | 🟢   |

---

### Architecture & Engineering

| Title                                    | What                                                                                                         | Why                                                                                     | Complexity | Priority | LLM | Size |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Caching layer for dashboard queries      | Cache 5-min via Redis or Next.js `revalidateTag`; invalidate on data change; monitor hit rate                | Dashboard CTEs are expensive; shows caching strategy thinking                           | S          | P1       | ⚡  | 🟢   |
| OpenTelemetry tracing                    | Instrument request → middleware → query → action → DB; export to Jaeger/Datadog; P95/P99 dashboards          | Observability is the difference between guessing and knowing; shows distributed tracing | M          | P1       | 🧠  | 🟡   |
| Background job queue (Bull/Bree)         | Async processing for emails, report generation, bulk imports; retry + dead-letter queue; admin job dashboard | Decouples slow ops from HTTP; shows production-grade async processing                   | M          | P1       | 🧠  | 🟡   |
| Health check endpoints (/health, /ready) | Shallow (app running) + deep (DB connections live) endpoints; JSON with version, uptime, dependency status   | Essential for load balancers and K8s; shows operational maturity                        | S          | P1       | ⚡  | 🟢   |
| Structured logging (Pino/Winston)        | JSON-format logs with traceId, userId, requestId, action, duration; aggregate to Datadog/CloudWatch          | Structured logs are searchable and actionable; shows production ops thinking            | M          | P1       | ⚡  | 🟡   |
| WebSocket / real-time updates            | Live updates for person create, leave requests, review notifications via Socket.io                           | Collaborative UX; shows real-time protocol understanding                                | M          | P2       | 🧠  | 🟡   |
| Feature flags (with A/B testing)         | LaunchDarkly or custom; enable per-user or env; track flag changes in audit log                              | Progressive rollouts; separates deployment from release                                 | M          | P2       | 🧠  | 🟡   |
| MongoDB schema validation ($jsonSchema)  | Enforce required fields on audit log documents at write-time; reject invalid docs                            | Document DB discipline; shows MongoDB best practices                                    | S          | P2       | ⚡  | 🟢   |
| Error tracking (Sentry)                  | Capture unhandled exceptions, server action failures, client errors; error grouping + alerts                 | Production stability visibility; table-stakes for portfolio                             | S          | P2       | ⚡  | 🟢   |
| API versioning strategy                  | Versioned server actions; deprecation notices; migration guides for breaking changes                         | Shows backward compatibility thinking for integrations                                  | M          | P3       | ⚡  | 🟡   |
| Read replicas for reporting queries      | Route audit log + report queries to read replica; monitor replication lag                                    | Shows database scaling awareness                                                        | M          | P3       | 🧠  | 🟡   |

---

### Testing & Quality

| Title                                       | What                                                                                                | Why                                                                    | Complexity | Priority | LLM | Size |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Visual regression testing (Percy/Chromatic) | Snapshot all components in all 6 themes; diff screenshots on PRs; flag layout shifts                | Catches UI bugs unit tests miss; shows visual testing discipline       | M          | P1       | ⚡  | 🟡   |
| Load & performance benchmarks (k6)          | 100 concurrent users; performance budgets (dashboard < 2s, mutations < 500ms); CI fails if exceeded | Empirical performance data; separates real systems from hobby projects | M          | P1       | 🧠  | 🟡   |
| Mutation testing (Stryker)                  | Mutate code; verify tests catch mutations; target > 80% mutation score                              | Next level beyond coverage; verifies tests actually validate behavior  | M          | P2       | ⚡  | 🟡   |
| axe-core accessibility in CI                | Run axe on every page in Playwright; fail CI on WCAG AA violations                                  | Automated a11y is table-stakes for serious projects                    | S          | P2       | ⚡  | 🟢   |
| Contract testing (Pact)                     | Client + server Pact tests for server action contracts; catch breaking changes early                | API contract discipline; shows microservices-ready thinking            | M          | P3       | ⚡  | 🟡   |

---

### DevOps & Infrastructure

| Title                              | What                                                                                            | Why                                                        | Complexity | Priority | LLM | Size |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- | -------- | --- | ---- |
| Kubernetes manifests & Helm charts | Deployment, Service, Ingress, ConfigMap, Secret; Helm chart; resource limits + readiness probes | Cloud-native deployment; shows orchestration understanding | M          | P2       | ⚡  | 🟡   |
| Blue-green deployment strategy     | Two production environments; switch traffic via LB; zero-downtime upgrades + instant rollback   | Shows deployment risk reduction thinking                   | M          | P2       | ⚡  | 🟡   |
| Staging environment parity         | Staging with anonymized production data; deploy-to-staging + E2E tests before prod              | Disciplined deployment process                             | S          | P2       | ⚡  | 🟢   |

---

## Nursebuddy Alignment

Top 5 features to prioritize for the target audience (MongoDB + SQL + admin tools):

1. **Polyglot persistence + audit log tamper detection** — demonstrates MongoDB mastery and compliance thinking
2. **Data encryption at rest with key rotation** — GDPR/healthcare compliance depth
3. **2FA + session management + IP allowlisting** — security-in-depth chain
4. **Background job queue + email notifications** — production-grade async architecture
5. **OpenTelemetry + structured logging + health checks** — operational excellence full stack

---

_All file:line references are from the 2026-03-24 codebase state. Read AUDIT_REPORT.md for earlier audit findings._
