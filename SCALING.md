# Scaling Analysis

Performance analysis and scaling documentation for HRManager.

## Dataset Profiles

| Scale              | Persons | Teams | Departments | Team Memberships | Leave Requests | Review Requests |
| ------------------ | ------- | ----- | ----------- | ---------------- | -------------- | --------------- |
| Small (dev)        | 50      | 10    | 5           | 100              | 50             | 100             |
| Medium (startup)   | 1,000   | 50    | 15          | 3,000            | 1,000          | 2,000           |
| Large (enterprise) | 10,000  | 200   | 50          | 30,000           | 5,000          | 5,000           |
| XL (target)        | 100,000 | 2,000 | 200         | 300,000          | 50,000         | 50,000          |

## N+1 Queries Found and Fixed

### 1. Review Cycles — Request Count Fetching

**Before:** `getReviewCycles()` included all `requests` rows (`include: { requests: { select: { status: true } } }`) just to count total and submitted. At 500 requests per cycle across 10 cycles, this fetched 5,000 rows into memory.

**After:** Uses `_count` aggregation for total requests and a single batched `groupBy` query for submitted counts across all cycles. Reduces transferred data from O(total_requests) to O(cycles).

**File:** `src/features/reviews/queries.ts`

### 2. Department Queries — Full Person Eager Loading

**Before:** `getDepartments()` and `getPagedDepartments()` used `include: { head: true }` which fetched the entire Person record (all columns) for each department head.

**After:** Uses `select: { name: true }` on the head relation, fetching only the name column needed for display. Also narrowed teams sub-query to only fetch `teamId` and `teamName`.

**File:** `src/features/departments/queries.ts`

### 3. Team Queries — Full Relation Eager Loading

**Before:** `getTeams()` and `getPagedTeams()` used `include: { manager: true, department: true }` fetching all columns from Person and Department tables for each team.

**After:** Uses `select` to fetch only the `name` field from manager and department relations, and `name` + `email` from person in member sub-queries.

**File:** `src/features/teams/queries.ts`

### 4. Manager Team Reviews — Unnecessary Data Fetching

**Before:** `getManagerTeamReviews()` fetched full person records for team members when only person IDs were needed for the subsequent review request query.

**After:** Uses `select: { personId: true }` on members, avoiding loading person name/email/position data that was never used.

**File:** `src/features/reviews/queries.ts`

## Database Indexes Added

Migration: `20260326000000_add_performance_indexes`

| Table           | Index                  | Reason                                                                                     |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `Person`        | `email`                | Login linking (`Person.email = User.email`), uniqueness checks on create/update            |
| `Person`        | `name`                 | ORDER BY in paginated queries, search ILIKE                                                |
| `Department`    | `headId`               | FK — JOIN when listing departments with head info                                          |
| `Team`          | `teamManagerId`        | FK — filter teams by manager, manager dashboard                                            |
| `Team`          | `departmentId`         | FK — JOIN when listing teams with department, org chart                                    |
| `TeamMember`    | `personId`             | WHERE filter for "which teams is this person in" (unique constraint covers composite only) |
| `TeamMember`    | `teamId`               | WHERE filter for "which members are in this team"                                          |
| `ReviewCycle`   | `templateId`           | FK — JOIN when including template name                                                     |
| `ReviewRequest` | `subjectId`            | "My reviews" queries filter by subject person                                              |
| `ReviewRequest` | `sessionId`            | Session-scoped filtering on all review queries                                             |
| `LeaveRequest`  | `(startDate, endDate)` | Overlap detection range queries                                                            |
| `LeaveRequest`  | `reviewerId`           | Reviewer lookup joins                                                                      |
| `LeaveBalance`  | `leaveTypeId`          | FK — JOIN when including leave type info                                                   |

**Total: 14 new indexes** across 7 tables.

### Index Impact Estimate

Without indexes, PostgreSQL performs sequential scans. Impact at scale:

| Query Pattern              | Without Index (10k persons) | With Index        |
| -------------------------- | --------------------------- | ----------------- |
| Person by email            | ~10ms seq scan              | <1ms index lookup |
| Teams by manager           | ~5ms seq scan on 200 rows   | <1ms index lookup |
| Leave overlap check        | ~50ms range scan on 5k rows | ~2ms B-tree range |
| Review requests by subject | ~20ms seq scan on 5k rows   | <1ms index lookup |
| Team members by person     | ~15ms seq scan on 30k rows  | <1ms index lookup |

## Performance Tools

### Seed Script (`scripts/perf-seed.ts`)

Seeds realistic large dataset: 10k persons, 50 departments, 200 teams, ~25k team memberships, 5k leave requests, 5k review requests.

```bash
npx tsx scripts/perf-seed.ts
```

### Benchmark Script (`scripts/perf-benchmark.ts`)

Benchmarks all major query patterns with warm-up runs, reports avg/min/max/P95 timing, and flags slow queries.

```bash
npx tsx scripts/perf-benchmark.ts
```

## Known Scaling Cliffs

### 1. Unbounded List Queries (Critical at 10k+)

**Problem:** Several queries fetch ALL records without pagination:

- `getPersons()` — returns all persons (used in dropdowns for manager selection, leave request forms)
- `getTeams()` — returns all teams with all members
- `getLeaveRequests()` — returns all leave requests
- `getLeaveBalances()` — returns all balances

**Impact at 100k:** These will return 100k+ rows, consuming hundreds of MB of memory and taking seconds to serialize/transfer.

**Mitigation (in place):** Paginated variants (`getPagedPersons`, `getPagedTeams`, `getPagedDepartments`) exist and are used by table views. The unbounded variants are used for form dropdowns and org chart.

**Recommendation:** Replace unbounded queries in form dropdowns with autocomplete search endpoints (fetch top 20 matches as user types). For org chart at 100k+, implement server-side tree pagination (load department > expand teams > expand members on demand).

### 2. Org Chart Data — Full Graph Load (Critical at 10k+)

**Problem:** `getOrgChartData()` loads ALL departments, ALL teams with ALL members, ALL persons, and ALL team memberships into memory to build the org chart tree.

**Impact at 100k:** Would attempt to load 100k+ Person records, 300k+ TeamMember records into a single response. Estimated 500MB+ memory, 5-10 second query time.

**Recommendation:** Implement hierarchical lazy loading — load only top-level departments initially, then load teams within a department on expand, then load members within a team on expand. Each level fetches only the immediate children.

### 3. Dashboard Growth Timeline — Cumulative Window Function (Moderate at 100k+)

**Problem:** The growth timeline CTE scans all persons, teams, and departments with UNION ALL, then computes cumulative window functions. At 100k persons, this processes 100k+ rows.

**Impact:** ~200-500ms at 100k, but cached with 5-minute TTL so only first hit is slow.

**Mitigation (in place):** `unstable_cache` with 300s TTL and `revalidateTag("dashboard")` invalidation.

**Recommendation:** For 100k+, consider materialized view or pre-computed daily aggregation table updated by a cron job.

### 4. Reports Raw SQL — Complex JOINs (Moderate at 100k+)

**Problem:** Headcount trends and turnover rate queries perform 4-way JOINs (Person → TeamMember → Team → Department) with window functions.

**Impact:** ~300-800ms at 100k with proper indexes (much worse without).

**Mitigation (in place):** Cached with 5-minute TTL.

**Recommendation:** For 100k+, create materialized views for monthly aggregations, refreshed daily via pg-boss job.

### 5. Zod Parsing Overhead (Moderate at 1k+ rows)

**Problem:** Every query result is parsed through `Schema.parse()` per row. Zod validation adds ~0.1-0.5ms per row.

**Impact at 10k:** ~1-5 seconds of pure CPU parsing on list queries.

**Recommendation:** For hot paths returning large lists, consider `Schema.array().parse()` (slightly faster than per-row) or skip validation for trusted DB output behind a feature flag.

### 6. Session Scoping — IS NOT DISTINCT FROM (Low impact)

**Problem:** Every query includes `sessionId IS NOT DISTINCT FROM $value` for demo session isolation. This is slightly slower than `= $value` because it handles NULL comparison.

**Impact:** Minimal with indexes on `sessionId`. The existing `@@index([sessionId])` on all tables handles this efficiently.

## Recommendations for 100k+ Employees

### Short-term (No Architecture Changes)

1. **Replace unbounded dropdown queries** with autocomplete search (top 20 results)
2. **Add pagination** to leave requests and leave balances list views
3. **Implement cursor-based pagination** for better performance than offset-based at deep pages

### Medium-term (Feature Work)

4. **Lazy-loading org chart** — load tree nodes on demand
5. **Materialized views** for dashboard metrics and report aggregations
6. **Background aggregation jobs** via pg-boss for expensive computations
7. **Redis caching layer** for frequently accessed, slowly changing data (department list, team list)

### Long-term (Architecture)

8. **Read replicas** — route read-heavy queries (dashboard, reports, org chart) to read replicas
9. **Database partitioning** — partition `LeaveRequest` and `ReviewRequest` by year for historical data
10. **Full-text search** — PostgreSQL `tsvector` indexes for cross-entity search (planned in backlog)
11. **Connection pooling** — PgBouncer in transaction mode (already compatible — all raw SQL uses unnamed prepared statements)
