/**
 * Performance Benchmark Script
 *
 * Measures query execution times for all major database queries against
 * a large dataset (seeded by perf-seed.ts). Reports timing statistics
 * and identifies slow queries (>100ms).
 *
 * Usage: npx tsx scripts/perf-benchmark.ts
 * Env:   DATABASE_URL must be set (reads from .env automatically)
 *
 * Pre-requisite: Run `npx tsx scripts/perf-seed.ts` first to seed data.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Load .env
const dotenv = await import("dotenv");
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Types ──────────────────────────────────────────────────────────────
interface BenchmarkResult {
  name: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  runs: number;
  rowCount?: number;
  status: "fast" | "acceptable" | "slow" | "critical";
}

// ── Benchmark Runner ───────────────────────────────────────────────────
const WARM_UP_RUNS = 2;
const BENCHMARK_RUNS = 10;
const SLOW_THRESHOLD_MS = 100;
const CRITICAL_THRESHOLD_MS = 500;

async function benchmark(
  name: string,
  fn: () => Promise<unknown>,
  runs = BENCHMARK_RUNS,
): Promise<BenchmarkResult> {
  // Warm up
  for (let i = 0; i < WARM_UP_RUNS; i++) {
    await fn();
  }

  const times: number[] = [];
  let lastResult: unknown;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    lastResult = await fn();
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)];
  const rowCount = Array.isArray(lastResult)
    ? lastResult.length
    : typeof lastResult === "object" && lastResult !== null && "items" in lastResult
      ? (lastResult as { items: unknown[] }).items.length
      : undefined;

  let status: BenchmarkResult["status"];
  if (p95 < SLOW_THRESHOLD_MS) status = "fast";
  else if (p95 < SLOW_THRESHOLD_MS * 2) status = "acceptable";
  else if (p95 < CRITICAL_THRESHOLD_MS) status = "slow";
  else status = "critical";

  return {
    name,
    avgMs: Math.round(avg * 100) / 100,
    minMs: Math.round(times[0] * 100) / 100,
    maxMs: Math.round(times[times.length - 1] * 100) / 100,
    p95Ms: Math.round(p95 * 100) / 100,
    runs,
    rowCount,
    status,
  };
}

// ── Queries to Benchmark ───────────────────────────────────────────────
async function main() {
  // Verify data exists
  const personCount = await prisma.person.count();
  if (personCount < 1000) {
    console.error(
      `❌ Only ${personCount} persons in DB. Run 'npx tsx scripts/perf-seed.ts' first.`,
    );
    process.exit(1);
  }
  console.log(`\n📊 Benchmarking against ${personCount.toLocaleString()} persons...\n`);

  const samplePerson = await prisma.person.findFirst({ select: { id: true } });
  const sampleTeam = await prisma.team.findFirst({ select: { teamId: true, teamManagerId: true } });
  const _sampleDept = await prisma.department.findFirst({ select: { id: true } });

  const results: BenchmarkResult[] = [];

  // ── Person Queries ─────────────────────────────────────────────────
  results.push(
    await benchmark("getPersons (all, no pagination)", () =>
      prisma.person.findMany({
        where: { deletedAt: null },
        omit: { sessionId: true, deletedAt: true },
      }),
    ),
  );

  results.push(
    await benchmark("getPagedPersons (page 1, 25 rows)", () =>
      Promise.all([
        prisma.person.findMany({
          where: { deletedAt: null },
          omit: { sessionId: true, deletedAt: true },
          orderBy: { name: "asc" },
          skip: 0,
          take: 25,
        }),
        prisma.person.count({ where: { deletedAt: null } }),
      ]),
    ),
  );

  results.push(
    await benchmark("getPagedPersons (search, page 1)", () =>
      prisma.person.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: "John", mode: "insensitive" } },
            { email: { contains: "John", mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
        skip: 0,
        take: 25,
      }),
    ),
  );

  results.push(
    await benchmark("getEmployeeProfile (single, with relations)", () =>
      prisma.person.findFirst({
        where: { id: samplePerson!.id, deletedAt: null },
        include: {
          teams: {
            where: { deletedAt: null, team: { deletedAt: null } },
            include: { team: { select: { teamId: true, teamName: true } } },
          },
          managedTeams: {
            where: { deletedAt: null },
            select: { teamId: true, teamName: true },
          },
          headOfDepartments: {
            where: { deletedAt: null },
            select: { id: true, name: true },
          },
        },
      }),
    ),
  );

  // ── Department Queries ─────────────────────────────────────────────
  results.push(
    await benchmark("getDepartments (all, with head + teams)", () =>
      prisma.department.findMany({
        where: { deletedAt: null },
        include: {
          head: { select: { name: true } },
          teams: { where: { deletedAt: null }, select: { teamId: true, teamName: true } },
        },
      }),
    ),
  );

  results.push(
    await benchmark("getPagedDepartments (page 1, 25 rows)", () =>
      Promise.all([
        prisma.department.findMany({
          where: { deletedAt: null },
          include: {
            head: { select: { name: true } },
            teams: { where: { deletedAt: null }, select: { teamId: true, teamName: true } },
          },
          orderBy: { name: "asc" },
          skip: 0,
          take: 25,
        }),
        prisma.department.count({ where: { deletedAt: null } }),
      ]),
    ),
  );

  // ── Team Queries ───────────────────────────────────────────────────
  results.push(
    await benchmark("getTeams (all, with manager + dept + members)", () =>
      prisma.team.findMany({
        where: { deletedAt: null },
        include: {
          manager: { select: { name: true } },
          department: { select: { name: true } },
          members: {
            where: { deletedAt: null },
            include: { person: { select: { name: true, email: true } } },
          },
        },
      }),
    ),
  );

  results.push(
    await benchmark("getPagedTeams (page 1, 25 rows)", () =>
      Promise.all([
        prisma.team.findMany({
          where: { deletedAt: null },
          include: {
            manager: { select: { name: true } },
            department: { select: { name: true } },
            members: {
              where: { deletedAt: null },
              include: { person: { select: { name: true, email: true } } },
            },
          },
          orderBy: { teamName: "asc" },
          skip: 0,
          take: 25,
        }),
        prisma.team.count({ where: { deletedAt: null } }),
      ]),
    ),
  );

  // ── Leave Queries ──────────────────────────────────────────────────
  results.push(
    await benchmark("getLeaveRequests (all, no pagination)", () =>
      prisma.leaveRequest.findMany({
        where: { deletedAt: null },
        include: {
          person: { select: { name: true } },
          leaveType: { select: { name: true, color: true } },
          reviewer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),
  );

  results.push(
    await benchmark("getLeaveBalances (all, no pagination)", () =>
      prisma.leaveBalance.findMany({
        include: {
          person: { select: { name: true } },
          leaveType: { select: { name: true, color: true } },
        },
        orderBy: [{ person: { name: "asc" } }, { leaveType: { name: "asc" } }],
      }),
    ),
  );

  results.push(
    await benchmark("getLeaveRequests (filtered by person)", () =>
      prisma.leaveRequest.findMany({
        where: { deletedAt: null, personId: samplePerson!.id },
        include: {
          person: { select: { name: true } },
          leaveType: { select: { name: true, color: true } },
          reviewer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),
  );

  // ── Review Queries ─────────────────────────────────────────────────
  results.push(
    await benchmark("getReviewCycles (with counts)", async () => {
      const cycles = await prisma.reviewCycle.findMany({
        where: { deletedAt: null },
        include: {
          template: { select: { name: true } },
          _count: { select: { requests: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      // Batch submitted counts
      const cycleIds = cycles.map((c) => c.id);
      if (cycleIds.length > 0) {
        await prisma.reviewRequest.groupBy({
          by: ["cycleId"],
          where: { cycleId: { in: cycleIds }, status: "SUBMITTED" },
          _count: { id: true },
        });
      }
      return cycles;
    }),
  );

  results.push(
    await benchmark("getManagerTeamReviews (single manager)", async () => {
      if (!sampleTeam?.teamManagerId) return [];
      const teams = await prisma.team.findMany({
        where: { teamManagerId: sampleTeam.teamManagerId, deletedAt: null },
        select: { members: { where: { deletedAt: null }, select: { personId: true } } },
      });
      const directReportIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.personId)))];
      if (directReportIds.length === 0) return [];
      return prisma.reviewRequest.findMany({
        where: { subjectId: { in: directReportIds } },
        include: {
          subject: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          cycle: { select: { id: true, name: true, status: true, startDate: true } },
        },
        orderBy: [{ cycle: { startDate: "desc" } }],
      });
    }),
  );

  // ── Dashboard Queries (raw SQL) ────────────────────────────────────
  results.push(
    await benchmark(
      "dashboard counts (raw SQL)",
      () =>
        prisma.$queryRaw`
        SELECT
          (SELECT COUNT(*)::int FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL) AS "totalPersons",
          (SELECT COUNT(*)::int FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL) AS "totalTeams",
          (SELECT COUNT(*)::int FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL) AS "totalDepartments",
          (SELECT COUNT(*)::int FROM "User") AS "totalUsers"
      `,
    ),
  );

  results.push(
    await benchmark(
      "dashboard team sizes (raw SQL)",
      () =>
        prisma.$queryRaw`
        SELECT
          t."teamName",
          COUNT(tm.id)::int AS "memberCount"
        FROM "Team" t
        LEFT JOIN "TeamMember" tm ON tm."teamId" = t."teamId" AND tm."deletedAt" IS NULL
        WHERE t."deletedAt" IS NULL AND t."sessionId" IS NULL
        GROUP BY t."teamId", t."teamName"
        ORDER BY t."teamName" ASC
      `,
    ),
  );

  results.push(
    await benchmark(
      "dashboard growth timeline (raw SQL)",
      () =>
        prisma.$queryRaw`
        WITH daily AS (
          SELECT date, SUM(p)::int AS p, SUM(t)::int AS t, SUM(d)::int AS d
          FROM (
            SELECT "createdAt"::date AS date, 1 AS p, 0 AS t, 0 AS d
            FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL
            UNION ALL
            SELECT "createdAt"::date AS date, 0 AS p, 1 AS t, 0 AS d
            FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL
            UNION ALL
            SELECT "createdAt"::date AS date, 0 AS p, 0 AS t, 1 AS d
            FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NULL
          ) combined
          GROUP BY date
        )
        SELECT
          date::text AS "date",
          SUM(p) OVER (ORDER BY date)::int AS "persons",
          SUM(t) OVER (ORDER BY date)::int AS "teams",
          SUM(d) OVER (ORDER BY date)::int AS "departments"
        FROM daily
        ORDER BY date ASC
      `,
    ),
  );

  // ── Org Chart (heavy query) ────────────────────────────────────────
  results.push(
    await benchmark(
      "getOrgChartData (all departments + teams + members)",
      () =>
        Promise.all([
          prisma.department.findMany({
            where: { deletedAt: null },
            include: {
              head: { select: { id: true, name: true } },
              teams: {
                where: { deletedAt: null },
                include: {
                  manager: { select: { id: true, name: true } },
                  members: {
                    where: { deletedAt: null },
                    include: {
                      person: { select: { id: true, name: true, position: true, email: true } },
                    },
                  },
                },
              },
            },
          }),
          prisma.team.findMany({
            where: { deletedAt: null, departmentId: null },
            include: {
              manager: { select: { id: true, name: true } },
              members: {
                where: { deletedAt: null },
                include: {
                  person: { select: { id: true, name: true, position: true, email: true } },
                },
              },
            },
          }),
          prisma.person.findMany({
            where: { deletedAt: null },
            select: { id: true },
          }),
          prisma.teamMember.findMany({
            where: { deletedAt: null },
            select: { personId: true },
          }),
        ]),
      5, // fewer runs — this is expensive
    ),
  );

  // ── Report Queries (raw SQL) ───────────────────────────────────────
  results.push(
    await benchmark("getPersonDeleteImpact (single person)", () =>
      Promise.all([
        prisma.team.findMany({
          where: { teamManagerId: samplePerson!.id, deletedAt: null },
          select: { teamId: true, teamName: true },
        }),
        prisma.department.findMany({
          where: { headId: samplePerson!.id, deletedAt: null },
          select: { id: true, name: true },
        }),
        prisma.teamMember.findMany({
          where: { personId: samplePerson!.id, deletedAt: null },
          select: { team: { select: { teamId: true, teamName: true } } },
        }),
        prisma.leaveRequest.count({
          where: { personId: samplePerson!.id, deletedAt: null },
        }),
        prisma.reviewRequest.count({
          where: { OR: [{ subjectId: samplePerson!.id }, { reviewerId: samplePerson!.id }] },
        }),
      ]),
    ),
  );

  // ── Print Results ──────────────────────────────────────────────────
  console.log("\n" + "═".repeat(105));
  console.log(
    "  Query".padEnd(55) +
      "Avg (ms)".padStart(10) +
      "P95 (ms)".padStart(10) +
      "Min".padStart(8) +
      "Max".padStart(8) +
      "Rows".padStart(8) +
      "  Status",
  );
  console.log("═".repeat(105));

  const statusIcons = {
    fast: "✅",
    acceptable: "🟡",
    slow: "🟠",
    critical: "🔴",
  };

  for (const r of results) {
    const rowStr = r.rowCount !== undefined ? r.rowCount.toLocaleString() : "-";
    console.log(
      `  ${r.name.padEnd(53)}${r.avgMs.toFixed(1).padStart(10)}${r.p95Ms.toFixed(1).padStart(10)}${r.minMs.toFixed(1).padStart(8)}${r.maxMs.toFixed(1).padStart(8)}${rowStr.padStart(8)}  ${statusIcons[r.status]} ${r.status}`,
    );
  }

  console.log("═".repeat(105));

  const slowQueries = results.filter((r) => r.status === "slow" || r.status === "critical");
  if (slowQueries.length > 0) {
    console.log(
      `\n⚠️  ${slowQueries.length} slow queries detected (P95 > ${SLOW_THRESHOLD_MS * 2}ms):`,
    );
    for (const r of slowQueries) {
      console.log(`  ${statusIcons[r.status]} ${r.name}: P95=${r.p95Ms.toFixed(1)}ms`);
    }
  } else {
    console.log("\n✅ All queries within acceptable performance thresholds.");
  }

  // ── Summary Statistics ─────────────────────────────────────────────
  const totalAvg = results.reduce((sum, r) => sum + r.avgMs, 0);
  const worstP95 = Math.max(...results.map((r) => r.p95Ms));
  console.log(`\n📊 Summary:`);
  console.log(`  Total queries benchmarked: ${results.length}`);
  console.log(`  Sum of averages:           ${totalAvg.toFixed(1)}ms`);
  console.log(`  Worst P95:                 ${worstP95.toFixed(1)}ms`);
  console.log(
    `  Fast (< ${SLOW_THRESHOLD_MS}ms P95):       ${results.filter((r) => r.status === "fast").length}`,
  );
  console.log(
    `  Acceptable:                ${results.filter((r) => r.status === "acceptable").length}`,
  );
  console.log(
    `  Slow (> ${SLOW_THRESHOLD_MS * 2}ms P95):       ${results.filter((r) => r.status === "slow").length}`,
  );
  console.log(
    `  Critical (> ${CRITICAL_THRESHOLD_MS}ms P95):    ${results.filter((r) => r.status === "critical").length}`,
  );
}

main()
  .catch((e) => {
    console.error("Benchmark failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
