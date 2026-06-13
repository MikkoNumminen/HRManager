import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { cache } from "@/lib/cache";
import {
  HeadcountTrendSchema,
  TurnoverRateSchema,
  LeaveUtilizationSchema,
  ReviewCompletionSchema,
  type ReportFilters,
  type HeadcountTrend,
  type TurnoverRate,
  type LeaveUtilization,
  type ReviewCompletion,
} from "./schemas";

// Raw SQL result types (PgBouncer-compatible unnamed parameterized queries)
interface HeadcountTrendRow {
  month: string;
  departmentName: string;
  hired: number;
  departed: number;
  runningHeadcount: number;
}

interface TurnoverRateRow {
  month: string;
  departmentName: string;
  startCount: number;
  departedCount: number;
  turnoverPct: number;
}

interface LeaveUtilizationRow {
  departmentName: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  utilizationPct: number;
}

interface ReviewCompletionRow {
  cycleName: string;
  cycleStatus: string;
  totalRequests: number;
  submittedCount: number;
  completionPct: number;
}

const CACHE_TTL = 300;

// ── Headcount Trends ────────────────────────────────────────────────────

export async function getHeadcountTrends(filters?: ReportFilters): Promise<HeadcountTrend[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchHeadcountTrendsCached(
    sessionId,
    filters?.departmentId ?? null,
    filters?.dateFrom ?? null,
    filters?.dateTo ?? null,
  );
}

const fetchHeadcountTrendsCached = cache(
  async (
    sessionId: string | null,
    departmentId: string | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<HeadcountTrend[]> => {
    return fetchHeadcountTrendsUncached(sessionId, departmentId, dateFrom, dateTo);
  },
  ["reports-headcount"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchHeadcountTrendsUncached(
  sessionId: string | null,
  departmentId: string | null,
  dateFrom: Date | null,
  dateTo: Date | null,
): Promise<HeadcountTrend[]> {
  const rows = await prisma.$queryRaw<HeadcountTrendRow[]>`
    WITH monthly_hires AS (
      SELECT
        to_char(p."createdAt", 'YYYY-MM') AS month,
        COALESCE(d."name", 'Unassigned') AS "departmentName",
        COUNT(*)::int AS hired
      FROM "Person" p
      LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."deletedAt" IS NULL AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."deletedAt" IS NULL AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Department" d ON d.id = t."departmentId" AND d."deletedAt" IS NULL AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
      WHERE p."deletedAt" IS NULL
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
        AND (${dateFrom}::timestamptz IS NULL OR p."createdAt" >= ${dateFrom})
        AND (${dateTo}::timestamptz IS NULL OR p."createdAt" <= ${dateTo})
      GROUP BY month, "departmentName"
    ),
    monthly_departures AS (
      SELECT
        to_char(p."deletedAt", 'YYYY-MM') AS month,
        COALESCE(d."name", 'Unassigned') AS "departmentName",
        COUNT(*)::int AS departed
      FROM "Person" p
      LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Department" d ON d.id = t."departmentId" AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
      WHERE p."deletedAt" IS NOT NULL
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
        AND (${dateFrom}::timestamptz IS NULL OR p."deletedAt" >= ${dateFrom})
        AND (${dateTo}::timestamptz IS NULL OR p."deletedAt" <= ${dateTo})
      GROUP BY month, "departmentName"
    ),
    combined AS (
      SELECT
        COALESCE(h.month, dep.month) AS month,
        COALESCE(h."departmentName", dep."departmentName") AS "departmentName",
        COALESCE(h.hired, 0) AS hired,
        COALESCE(dep.departed, 0) AS departed
      FROM monthly_hires h
      FULL OUTER JOIN monthly_departures dep
        ON h.month = dep.month AND h."departmentName" = dep."departmentName"
    )
    SELECT
      month,
      "departmentName",
      hired::int,
      departed::int,
      SUM(hired - departed) OVER (PARTITION BY "departmentName" ORDER BY month)::int AS "runningHeadcount"
    FROM combined
    ORDER BY month ASC, "departmentName" ASC
  `;

  return rows.map((r) =>
    HeadcountTrendSchema.parse({
      month: r.month,
      departmentName: r.departmentName,
      hired: r.hired ?? 0,
      departed: r.departed ?? 0,
      runningHeadcount: r.runningHeadcount ?? 0,
    }),
  );
}

// ── Turnover Rates ──────────────────────────────────────────────────────

export async function getTurnoverRates(filters?: ReportFilters): Promise<TurnoverRate[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchTurnoverRatesCached(
    sessionId,
    filters?.departmentId ?? null,
    filters?.dateFrom ?? null,
    filters?.dateTo ?? null,
  );
}

const fetchTurnoverRatesCached = cache(
  async (
    sessionId: string | null,
    departmentId: string | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<TurnoverRate[]> => {
    return fetchTurnoverRatesUncached(sessionId, departmentId, dateFrom, dateTo);
  },
  ["reports-turnover"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchTurnoverRatesUncached(
  sessionId: string | null,
  departmentId: string | null,
  dateFrom: Date | null,
  dateTo: Date | null,
): Promise<TurnoverRate[]> {
  const rows = await prisma.$queryRaw<TurnoverRateRow[]>`
    WITH months AS (
      SELECT DISTINCT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        COALESCE(${dateFrom}::timestamptz, NOW() - INTERVAL '12 months'),
        COALESCE(${dateTo}::timestamptz, NOW()),
        '1 month'
      ) d
    ),
    dept_list AS (
      SELECT COALESCE(d."name", 'Unassigned') AS "departmentName", d.id AS dept_id
      FROM "Department" d
      WHERE d."deletedAt" IS NULL
        AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
    ),
    start_counts AS (
      SELECT
        m.month,
        dl."departmentName",
        COUNT(p.id)::int AS "startCount"
      FROM months m
      CROSS JOIN dept_list dl
      LEFT JOIN "Team" t ON t."departmentId" = dl.dept_id AND t."deletedAt" IS NULL AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "TeamMember" tm ON tm."teamId" = t."teamId" AND tm."deletedAt" IS NULL AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Person" p ON p.id = tm."personId"
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND p."createdAt" < (m.month || '-01')::date
        AND (p."deletedAt" IS NULL OR p."deletedAt" >= (m.month || '-01')::date)
      GROUP BY m.month, dl."departmentName"
    ),
    departure_counts AS (
      SELECT
        to_char(p."deletedAt", 'YYYY-MM') AS month,
        COALESCE(d."name", 'Unassigned') AS "departmentName",
        COUNT(*)::int AS "departedCount"
      FROM "Person" p
      LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Department" d ON d.id = t."departmentId" AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
      WHERE p."deletedAt" IS NOT NULL
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
        AND (${dateFrom}::timestamptz IS NULL OR p."deletedAt" >= ${dateFrom})
        AND (${dateTo}::timestamptz IS NULL OR p."deletedAt" <= ${dateTo})
      GROUP BY month, "departmentName"
    )
    SELECT
      sc.month,
      sc."departmentName",
      sc."startCount"::int,
      COALESCE(dc."departedCount", 0)::int AS "departedCount",
      CASE WHEN sc."startCount" > 0
        THEN ROUND(COALESCE(dc."departedCount", 0)::numeric / sc."startCount" * 100, 1)
        ELSE 0
      END::float AS "turnoverPct"
    FROM start_counts sc
    LEFT JOIN departure_counts dc
      ON sc.month = dc.month AND sc."departmentName" = dc."departmentName"
    ORDER BY sc.month ASC, sc."departmentName" ASC
  `;

  return rows.map((r) =>
    TurnoverRateSchema.parse({
      month: r.month,
      departmentName: r.departmentName,
      startCount: r.startCount ?? 0,
      departedCount: r.departedCount ?? 0,
      turnoverPct: r.turnoverPct ?? 0,
    }),
  );
}

// ── Leave Utilization ───────────────────────────────────────────────────

export async function getLeaveUtilization(filters?: ReportFilters): Promise<LeaveUtilization[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const year = filters?.year ?? new Date().getFullYear();
  return fetchLeaveUtilizationCached(sessionId, filters?.departmentId ?? null, year);
}

const fetchLeaveUtilizationCached = cache(
  async (
    sessionId: string | null,
    departmentId: string | null,
    year: number,
  ): Promise<LeaveUtilization[]> => {
    return fetchLeaveUtilizationUncached(sessionId, departmentId, year);
  },
  ["reports-leave"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchLeaveUtilizationUncached(
  sessionId: string | null,
  departmentId: string | null,
  year: number,
): Promise<LeaveUtilization[]> {
  const rows = await prisma.$queryRaw<LeaveUtilizationRow[]>`
    SELECT
      COALESCE(dept."name", 'Unassigned') AS "departmentName",
      lt."name" AS "leaveTypeName",
      lt."color" AS "leaveTypeColor",
      SUM(lb."allocated")::int AS "totalAllocated",
      SUM(lb."used")::int AS "totalUsed",
      SUM(lb."allocated" - lb."used")::int AS "totalRemaining",
      CASE WHEN SUM(lb."allocated") > 0
        THEN ROUND(SUM(lb."used")::numeric / SUM(lb."allocated") * 100, 1)
        ELSE 0
      END::float AS "utilizationPct"
    FROM "LeaveBalance" lb
    JOIN "LeaveType" lt ON lt.id = lb."leaveTypeId" AND lt."deletedAt" IS NULL
    JOIN "Person" p ON p.id = lb."personId" AND p."deletedAt" IS NULL AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."deletedAt" IS NULL AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."deletedAt" IS NULL AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "Department" dept ON dept.id = t."departmentId" AND dept."deletedAt" IS NULL AND dept."sessionId" IS NOT DISTINCT FROM ${sessionId}
    WHERE lb."year" = ${year}
      AND lb."sessionId" IS NOT DISTINCT FROM ${sessionId}
      AND (${departmentId}::text IS NULL OR dept.id = ${departmentId})
    GROUP BY "departmentName", lt."name", lt."color"
    ORDER BY "departmentName" ASC, lt."name" ASC
  `;

  return rows.map((r) =>
    LeaveUtilizationSchema.parse({
      departmentName: r.departmentName,
      leaveTypeName: r.leaveTypeName,
      leaveTypeColor: r.leaveTypeColor,
      totalAllocated: r.totalAllocated ?? 0,
      totalUsed: r.totalUsed ?? 0,
      totalRemaining: r.totalRemaining ?? 0,
      utilizationPct: r.utilizationPct ?? 0,
    }),
  );
}

// ── Review Completion Rates ─────────────────────────────────────────────

export async function getReviewCompletionRates(
  _filters?: ReportFilters,
): Promise<ReviewCompletion[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchReviewCompletionCached(sessionId);
}

const fetchReviewCompletionCached = cache(
  async (sessionId: string | null): Promise<ReviewCompletion[]> => {
    return fetchReviewCompletionUncached(sessionId);
  },
  ["reports-reviews"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchReviewCompletionUncached(
  sessionId: string | null,
): Promise<ReviewCompletion[]> {
  const rows = await prisma.$queryRaw<ReviewCompletionRow[]>`
    SELECT
      rc."name" AS "cycleName",
      rc."status"::text AS "cycleStatus",
      COUNT(rr.id)::int AS "totalRequests",
      COUNT(CASE WHEN rr."status" = 'SUBMITTED' THEN 1 END)::int AS "submittedCount",
      CASE WHEN COUNT(rr.id) > 0
        THEN ROUND(COUNT(CASE WHEN rr."status" = 'SUBMITTED' THEN 1 END)::numeric / COUNT(rr.id) * 100, 1)
        ELSE 0
      END::float AS "completionPct"
    FROM "ReviewCycle" rc
    LEFT JOIN "ReviewRequest" rr ON rr."cycleId" = rc.id
    WHERE rc."deletedAt" IS NULL
      AND rc."sessionId" IS NOT DISTINCT FROM ${sessionId}
    GROUP BY rc.id, rc."name", rc."status"
    ORDER BY rc."startDate" DESC
  `;

  return rows.map((r) =>
    ReviewCompletionSchema.parse({
      cycleName: r.cycleName,
      cycleStatus: r.cycleStatus,
      totalRequests: r.totalRequests ?? 0,
      submittedCount: r.submittedCount ?? 0,
      completionPct: r.completionPct ?? 0,
    }),
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────

export type ReportType = "headcount" | "turnover" | "leave" | "reviews";

export async function exportReportCsv(
  reportType: ReportType,
  filters?: ReportFilters,
): Promise<string> {
  const allowed = await hasPermission("reports:export");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  switch (reportType) {
    case "headcount": {
      const data = await getHeadcountTrends(filters);
      return toCsv(
        ["Month", "Department", "Hired", "Departed", "Running Headcount"],
        data.map((r) => [r.month, r.departmentName, r.hired, r.departed, r.runningHeadcount]),
      );
    }
    case "turnover": {
      const data = await getTurnoverRates(filters);
      return toCsv(
        ["Month", "Department", "Start Count", "Departed", "Turnover %"],
        data.map((r) => [r.month, r.departmentName, r.startCount, r.departedCount, r.turnoverPct]),
      );
    }
    case "leave": {
      const data = await getLeaveUtilization(filters);
      return toCsv(
        ["Department", "Leave Type", "Allocated", "Used", "Remaining", "Utilization %"],
        data.map((r) => [
          r.departmentName,
          r.leaveTypeName,
          r.totalAllocated,
          r.totalUsed,
          r.totalRemaining,
          r.utilizationPct,
        ]),
      );
    }
    case "reviews": {
      const data = await getReviewCompletionRates(filters);
      return toCsv(
        ["Cycle", "Status", "Total Requests", "Submitted", "Completion %"],
        data.map((r) => [
          r.cycleName,
          r.cycleStatus,
          r.totalRequests,
          r.submittedCount,
          r.completionPct,
        ]),
      );
    }
  }
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}
