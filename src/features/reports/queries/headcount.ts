import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { cache } from "@/lib/cache";
import { HeadcountTrendSchema, type ReportFilters, type HeadcountTrend } from "../schemas";
import { CACHE_TTL } from "./_shared";

// Raw SQL result types (PgBouncer-compatible unnamed parameterized queries)
interface HeadcountTrendRow {
  month: string;
  departmentName: string;
  hired: number;
  departed: number;
  runningHeadcount: number;
}

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
